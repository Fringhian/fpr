import { createHmac } from "node:crypto";
import { ADJECTIVES, ANIMALS } from "./pseudonym-words.js";

/**
 * The adjective and animal of one person, such as `Calm Otter`: the first
 * four bytes of `HMAC-SHA256(secret, userId)` pick the adjective, the next
 * four the animal. Two people can share it; `pseudonyms` tells them apart.
 */
export function basePseudonym(secret: string, userId: string): string {
  const digest = createHmac("sha256", secret).update(userId).digest();
  const adjective = pick(ADJECTIVES, digest.readUInt32BE(0));
  const animal = pick(ANIMALS, digest.readUInt32BE(4));
  return `${adjective} ${animal}`;
}

/**
 * Every person's pseudonym, by user id. Among people with the same base
 * pseudonym, the smallest id keeps it and the next ones get ` 2`, ` 3`, and so
 * on. Ids are UUIDv7, so the smallest is the person added first.
 *
 * `userIds` is every person of the instance, not only those a response shows,
 * so a suffix is the same on every screen. Nothing is stored: the same secret
 * and people give the same pseudonyms.
 */
export function pseudonyms(
  secret: string,
  userIds: Iterable<string>,
): ReadonlyMap<string, string> {
  const ids = [...new Set(userIds)].sort();
  const taken = new Map<string, number>();
  const result = new Map<string, string>();
  for (const id of ids) {
    const base = basePseudonym(secret, id);
    const rank = (taken.get(base) ?? 0) + 1;
    taken.set(base, rank);
    result.set(id, rank === 1 ? base : `${base} ${rank}`);
  }
  return result;
}

function pick(words: readonly string[], value: number): string {
  const word = words[value % words.length];
  if (word === undefined) {
    throw new Error("A pseudonym word list is empty");
  }
  return word;
}
