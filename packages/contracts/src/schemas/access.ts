import { z } from "zod";
import { accessKeyPattern, passwordLength } from "../values.js";

/** A new password: 12 to 128 characters. */
export const passwordSchema = z
  .string()
  .min(passwordLength.min)
  .max(passwordLength.max);

/** An access key: 32 random bytes in base64url, the end of `/access/<key>`. */
export const accessKeySchema = z
  .string()
  .regex(accessKeyPattern, { error: "Expected an access key" });

/**
 * A one-time password reset key. A secret, shown once and never logged or
 * stored: only its hash is stored.
 */
export const resetKeySchema = z.string().min(1);
