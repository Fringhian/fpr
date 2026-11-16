import type { AccessKeyState } from "@fpr/contracts";
import { type AccessKey, accessKeys, type Db } from "@fpr/db";

type KnownKeyState = Exclude<AccessKeyState, "unknown">;

/**
 * What a key is now, in this order:
 * - `replaced` or `revoked` once revoked, `replaced` when the person has a
 *   newer key;
 * - `ended` once `accessUntil` has passed, claimed or not, since claiming it
 *   gives no access;
 * - `claimed` once used;
 * - `expired` once `claimBefore` has passed;
 * - `waiting` otherwise.
 */
export function keyState(
  key: AccessKey,
  latestKeyId: string,
  now: Date,
): KnownKeyState {
  if (key.revokedAt !== null) {
    return latestKeyId === key.id ? "revoked" : "replaced";
  }
  if (key.accessUntil !== null && key.accessUntil <= now) {
    return "ended";
  }
  if (key.claimedAt !== null) {
    return "claimed";
  }
  return key.claimBefore <= now ? "expired" : "waiting";
}

/** A key's state, reading the person's latest key to tell a replaced key. */
export async function readKeyState(
  db: Db,
  key: AccessKey,
): Promise<KnownKeyState> {
  const latest = await accessKeys.findCurrent(db, key.userId);
  return keyState(key, latest?.id ?? key.id, new Date());
}
