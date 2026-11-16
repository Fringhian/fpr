import type { Id } from "@fpr/contracts";

const adjectives = [
  "Agile",
  "Amber",
  "Bold",
  "Brave",
  "Bright",
  "Calm",
  "Clever",
  "Cosmic",
  "Gentle",
  "Golden",
  "Jolly",
  "Lucky",
  "Mellow",
  "Nimble",
  "Quiet",
  "Swift",
];

const animals = [
  "Badger",
  "Crane",
  "Dolphin",
  "Falcon",
  "Fox",
  "Heron",
  "Ibex",
  "Koala",
  "Lynx",
  "Marten",
  "Otter",
  "Panda",
  "Puffin",
  "Seal",
  "Swan",
  "Wren",
];

/** FNV-1a: a stable 32-bit hash, standing in for the API's HMAC. */
function hash(text: string): number {
  let value = 0x811c9dc5;
  for (const character of text) {
    value =
      Math.imul(value ^ (character.codePointAt(0) ?? 0), 0x01000193) >>> 0;
  }
  return value;
}

/**
 * Every person's pseudonym, an adjective and an animal picked from their id,
 * as the API derives them: among people with the same one, the smallest id
 * keeps it and the next ones get ` 2`, ` 3`, and so on.
 */
export function pseudonyms(userIds: Iterable<Id>): ReadonlyMap<Id, string> {
  const taken = new Map<string, number>();
  const result = new Map<Id, string>();
  for (const id of [...new Set(userIds)].sort()) {
    const base = `${adjectives[hash(id) % adjectives.length]} ${animals[hash(`${id}:animal`) % animals.length]}`;
    const rank = (taken.get(base) ?? 0) + 1;
    taken.set(base, rank);
    result.set(id, rank === 1 ? base : `${base} ${rank}`);
  }
  return result;
}
