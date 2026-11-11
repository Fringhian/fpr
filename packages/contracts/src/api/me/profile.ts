import { z } from "zod";
import { errorMap, signedInRoute } from "../../contract.js";
import { roleSchema, roles } from "../../roles.js";
import {
  colorSchema,
  displayNameSchema,
  personSchema,
} from "../../schemas/person.js";

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

/** The roles that edit their own profile: everyone but anonymous viewers. */
export const meEditorRoles = ["admin", "member", "guest"] as const;

/** What `PATCH /me` changes: at least one field, each left out kept. */
export const meUpdateBodySchema = z
  .object({
    displayName: displayNameSchema.optional(),
    /** Refused with `color_taken` when another person has it, unless all ten are taken. */
    color: colorSchema.optional(),
    language: languageSchema.optional(),
    /** Marks onboarding finished. It can't be unmarked. */
    onboarded: z.literal(true).optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    error: "Expected at least one field to change",
  })
  .meta({ description: "At least one field. A field left out is kept." });

export type MeUpdateBody = z.infer<typeof meUpdateBodySchema>;

export const getMe = signedInRoute(roles)
  .route({ method: "GET", path: "/me", summary: "The signed-in person" })
  .output(meSchema);

export const updateMe = signedInRoute(meEditorRoles)
  .route({
    method: "PATCH",
    path: "/me",
    summary:
      "Change the display name, colour, or language, or finish onboarding",
  })
  .input(meUpdateBodySchema)
  .output(meSchema)
  .errors(errorMap("invalid_request", "forbidden", "color_taken"));
