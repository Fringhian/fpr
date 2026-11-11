import { z } from "zod";

/** Every role a person can have. */
export const roles = ["admin", "member", "guest", "anonymous"] as const;

export const roleSchema = z.enum(roles);

export type Role = z.infer<typeof roleSchema>;
