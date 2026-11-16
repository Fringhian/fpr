import { Role } from "@fpr/contracts";
import { accounts, type Db, resetKeys, sessions, users } from "@fpr/db";
import { apiError } from "../errors.js";
import { api } from "../implement.js";
import { hashKey } from "./keys.js";

/**
 * The reset key of this email and key pair, when it can still be used: not
 * used, not revoked, before `expiresAt`, and given to the person with this
 * email, who signs in with a password.
 */
async function usableResetKey(db: Db, email: string, key: string) {
  const resetKey = await resetKeys.findByCodeHash(db, hashKey(key));
  if (
    resetKey === undefined ||
    resetKey.usedAt !== null ||
    resetKey.revokedAt !== null ||
    resetKey.expiresAt <= new Date()
  ) {
    return undefined;
  }
  const user = await users.findById(db, resetKey.userId);
  if (
    user === undefined ||
    user.role === Role.anonymous ||
    user.email !== email.toLowerCase()
  ) {
    return undefined;
  }
  return resetKey;
}

/**
 * Page 1 of a password reset: answers `204` for a usable pair, and
 * `invalid_reset_key` otherwise, without saying which part is wrong.
 */
export const checkPasswordReset = api.access.checkReset.handler(
  async ({ context: { db }, input }) => {
    if ((await usableResetKey(db, input.email, input.key)) === undefined) {
      throw apiError("invalid_reset_key");
    }
  },
);

/**
 * Page 2 of a password reset: sets the password, hashed with Better Auth's
 * hasher, uses the reset key, and deletes every session of the person, in
 * one transaction. The key is used once, even by two resets at once.
 */
export const resetPassword = api.access.reset.handler(
  async ({ context: { db, auth }, input }) => {
    const resetKey = await usableResetKey(db, input.email, input.key);
    if (resetKey === undefined) {
      throw apiError("invalid_reset_key");
    }
    const passwordHash = await (await auth.$context).password.hash(
      input.password,
    );
    await db.transaction().execute(async (trx) => {
      if ((await resetKeys.markUsed(trx, resetKey.id)) === undefined) {
        throw apiError("invalid_reset_key");
      }
      await accounts.setPassword(trx, resetKey.userId, passwordHash);
      await sessions.deleteForUser(trx, resetKey.userId);
    });
  },
);
