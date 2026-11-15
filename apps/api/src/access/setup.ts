import { Role } from "@fpr/contracts";
import { accessKeys, accounts, users } from "@fpr/db";
import { apiError } from "../errors.js";
import { api } from "../implement.js";
import { newKey, sameSecret } from "./keys.js";
import { startSession } from "./session.js";

/** The colours a person can have, from 1 to 10. */
const colorCount = 10;

/** Whether an admin exists, which closes `/setup`. */
export const getSetupStatus = api.access.setupStatus.handler(
  async ({ context }) => ({
    adminExists: (await users.countAdmins(context.db)) > 0,
  }),
);

/**
 * Creates the first admin, with a password and a claimed access key, and
 * starts their session. Refused with `admin_exists` once an admin exists,
 * whatever the key, then with `invalid_bootstrap_key` for a key other than
 * `ADMIN_BOOTSTRAP_KEY`. Two setups at once create one admin: the other is
 * refused with `admin_exists`.
 */
export const setUpFirstAdmin = api.access.setup.handler(
  async ({ context, input }) => {
    const { db, auth, bootstrapKey } = context;
    if ((await users.countAdmins(db)) > 0) {
      throw apiError("admin_exists");
    }
    if (!sameSecret(input.bootstrapKey, bootstrapKey)) {
      throw apiError("invalid_bootstrap_key");
    }
    const passwordHash = await (await auth.$context).password.hash(
      input.password,
    );

    const admin = await db.transaction().execute(async (trx) => {
      await users.lockFirstAdminSetup(trx);
      if ((await users.countAdmins(trx)) > 0) {
        throw apiError("admin_exists");
      }
      const taken = new Set(await users.colorsInUse(trx));
      const color =
        Array.from({ length: colorCount }, (_, index) => index + 1).find(
          (candidate) => !taken.has(candidate),
        ) ?? 1;
      const user = await users.insert(trx, {
        email: input.email,
        displayName: input.displayName,
        role: Role.admin,
        color,
        avatarKey: null,
        locale: null,
        onboardedAt: null,
      });
      await accounts.setPassword(trx, user.id, passwordHash);
      await accessKeys.insert(trx, {
        userId: user.id,
        codeHash: newKey().codeHash,
        claimedAt: new Date(),
        accessUntil: null,
        revokedAt: null,
        createdBy: null,
      });
      return user;
    });

    await startSession(context, admin.id);
  },
);
