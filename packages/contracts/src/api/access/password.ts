import { z } from "zod";

/** A new password: 12 to 128 characters. */
export const passwordSchema = z.string().min(12).max(128);
