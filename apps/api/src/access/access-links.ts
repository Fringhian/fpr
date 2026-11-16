import {
  type AccessCheckResponse,
  type AccessKeyState,
  type InvalidRequestDetails,
  Role,
} from "@fpr/contracts";
import { accessKeys, accounts, type User, users } from "@fpr/db";
import { apiError } from "../errors.js";
import { api } from "../implement.js";
import { avatarUrl } from "../me/me.js";
import { readKeyState } from "./key-state.js";
import { hashKey } from "./keys.js";
import { startSession } from "./session.js";

/** `invalid_access_key`, with the key's state in `details`. */
function invalidAccessKey(state: AccessKeyState) {
  return apiError("invalid_access_key", { state });
}

/** `invalid_request` for the claim's `password` field. */
function invalidPassword(code: "invalid_type" | "unrecognized_keys") {
  const details: InvalidRequestDetails = {
    issues: [{ path: ["password"], code }],
  };
  return apiError("invalid_request", details);
}

/** Whether the person signs in with the link itself: an anonymous viewer. */
const signsInWithLink = (user: User) => user.role === Role.anonymous;

/**
 * A key's state, and how its person signs in. A waiting key of a password
 * user also gives their email, display name, colour, picture, and whether
 * they already have a password, from an earlier link.
 */
export const checkAccessKey = api.access.check.handler(
  async ({ context: { db }, input }): Promise<AccessCheckResponse> => {
    const key = await accessKeys.findByCodeHash(db, hashKey(input.key));
    const user = key && (await users.findById(db, key.userId));
    if (key === undefined || user === undefined) {
      return { state: "unknown" };
    }
    const state = await readKeyState(db, key);
    if (signsInWithLink(user)) {
      return { state, signsInWith: "link" };
    }
    if (state === "waiting") {
      return {
        state,
        signsInWith: "password",
        email: user.email,
        displayName: user.displayName,
        color: user.color,
        avatarUrl: avatarUrl(user),
        hasPassword: await accounts.hasPassword(db, user.id),
      };
    }
    return { state, signsInWith: "password" };
  },
);

/**
 * Claims a password user's waiting key. A person without a password sets
 * one, hashed with Better Auth's hasher, and is signed in. A person who
 * already has one, from an earlier link, sends none and signs in with it.
 * The key is locked while it is claimed, so it is claimed once.
 */
export const claimAccessKey = api.access.claim.handler(
  async ({ context, input }) => {
    const { db, auth } = context;
    const claimed = await db.transaction().execute(async (trx) => {
      const key = await accessKeys.lockByCodeHash(trx, hashKey(input.key));
      if (key === undefined) {
        throw invalidAccessKey("unknown");
      }
      const state = await readKeyState(trx, key);
      const user = await users.findById(trx, key.userId);
      if (state !== "waiting" || user === undefined || signsInWithLink(user)) {
        throw invalidAccessKey(state);
      }
      const hasPassword = await accounts.hasPassword(trx, user.id);
      if (hasPassword && input.password !== undefined) {
        throw invalidPassword("unrecognized_keys");
      }
      if (!hasPassword && input.password === undefined) {
        throw invalidPassword("invalid_type");
      }
      if (input.password !== undefined) {
        const { password } = await auth.$context;
        await accounts.setPassword(
          trx,
          user.id,
          await password.hash(input.password),
        );
      }
      await accessKeys.claim(trx, key.id);
      return { userId: user.id, signedIn: !hasPassword };
    });

    if (claimed.signedIn) {
      await startSession(context, claimed.userId);
    }
    return { signedIn: claimed.signedIn };
  },
);

/**
 * Signs an anonymous viewer in with their key, every time while it gives
 * access. The first visit claims it. A password user's key is refused.
 */
export const signInWithAccessKey = api.access.signIn.handler(
  async ({ context, input }) => {
    const { db } = context;
    const userId = await db.transaction().execute(async (trx) => {
      const key = await accessKeys.lockByCodeHash(trx, hashKey(input.key));
      if (key === undefined) {
        throw invalidAccessKey("unknown");
      }
      const state = await readKeyState(trx, key);
      const user = await users.findById(trx, key.userId);
      if (
        (state !== "waiting" && state !== "claimed") ||
        user === undefined ||
        !signsInWithLink(user)
      ) {
        throw invalidAccessKey(state);
      }
      if (state === "waiting") {
        await accessKeys.claim(trx, key.id);
      }
      return user.id;
    });

    await startSession(context, userId);
  },
);
