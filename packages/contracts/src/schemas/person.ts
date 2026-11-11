import { z } from "zod";
import { personal } from "../anonymize.js";
import { idSchema } from "./ids.js";

/**
 * A sign-in email. Unmarked: a response field wraps it with `personal()`, so
 * the anonymizer replaces it.
 */
export const emailSchema = z.email();

/** The name shown on leaderboards: 1 to 40 characters, trimmed. */
export const displayNameSchema = z.string().trim().min(1).max(40);

/** A person's colour, from 1 to 10. */
export const colorSchema = z.int().min(1).max(10);

/** A person as every screen shows them: name, picture, and colour. */
export const personSchema = z.object({
  id: idSchema,
  displayName: personal(displayNameSchema),
  /** The uploaded picture, or `null`: the web app draws the initial on the colour. */
  avatarUrl: personal(z.string().nullable()),
  color: colorSchema,
});

export type Person = z.infer<typeof personSchema>;
