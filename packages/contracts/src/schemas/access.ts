import { z } from "zod";

/** A new password: 12 to 128 characters. */
export const passwordSchema = z.string().min(12).max(128);

/** An access key: 32 random bytes in base64url, the end of `/access/<key>`. */
export const accessKeySchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, { error: "Expected an access key" });

/**
 * A one-time password reset key. A secret, shown once and never logged or
 * stored: only its hash is stored.
 */
export const resetKeySchema = z.string().min(1);
