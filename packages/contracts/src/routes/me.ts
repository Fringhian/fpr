import { z } from "zod";
import { personal } from "../anonymize.js";
import { roleSchema, roles } from "../roles.js";
import { defineRoute } from "../route.js";

/** The languages FPR is written in. */
export const languages = ["fr", "en"] as const;

export const languageSchema = z.enum(languages);

export type Language = z.infer<typeof languageSchema>;

/** The signed-in person. */
export const meSchema = z.object({
  id: z.uuid(),
  role: roleSchema,
  displayName: personal(z.string().min(1).max(40)),
  /** The uploaded picture, or `null`: the web app draws the initial on the colour. */
  avatarUrl: personal(z.string().nullable()),
  color: z.int().min(1).max(10),
  /** `null` until the person picks one: the web app follows the browser. */
  language: languageSchema.nullable(),
  onboarded: z.boolean(),
});

export type Me = z.infer<typeof meSchema>;

export const getMe = defineRoute({
  method: "get",
  path: "/me",
  summary: "The signed-in person",
  roles,
  responses: { 200: meSchema },
});
