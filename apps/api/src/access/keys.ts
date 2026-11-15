import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** A new key, and the hash that is stored in its place. */
export interface NewKey {
  /** 32 random bytes in base64url, shown once and never stored. */
  key: string;
  /** Its SHA-256 hash, in hexadecimal. */
  codeHash: string;
}

/** The stored form of an access or reset key: its SHA-256 hash, in hexadecimal. */
export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** A new access or reset key: 32 random bytes in base64url, with its hash. */
export function newKey(): NewKey {
  const key = randomBytes(32).toString("base64url");
  return { key, codeHash: hashKey(key) };
}

/**
 * Whether two secrets are equal, compared in constant time: their SHA-256
 * digests have the same length whatever the secrets' lengths.
 */
export function sameSecret(given: string, expected: string): boolean {
  const digest = (secret: string) =>
    createHash("sha256").update(secret).digest();
  return timingSafeEqual(digest(given), digest(expected));
}
