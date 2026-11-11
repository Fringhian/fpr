import { z } from "zod";
import { signedInRoute } from "../../contract.js";
import { roleSchema, roles } from "../../roles.js";
import { personSchema } from "../../schemas/person.js";

/** The languages FPR is written in. */
export const languages = ["fr", "en"] as const;

export const languageSchema = z.enum(languages);

export type Language = z.infer<typeof languageSchema>;

/** The signed-in person. */
export const meSchema = personSchema.extend({
  role: roleSchema,
  /** `null` until the person picks one: the web app follows the browser. */
  language: languageSchema.nullable(),
  onboarded: z.boolean(),
});

export type Me = z.infer<typeof meSchema>;

export const getMe = signedInRoute(roles)
  .route({ method: "GET", path: "/me", summary: "The signed-in person" })
  .output(meSchema);
