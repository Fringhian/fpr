import { z } from "zod";
import {
  adminAreaRoles,
  adminRoles,
  profileRoles,
  roles,
  writerRoles,
} from "./values.js";

export { adminAreaRoles, adminRoles, profileRoles, roles, writerRoles };

export const roleSchema = z.enum(roles);

export type Role = z.infer<typeof roleSchema>;

/** Each role by name, such as `Role.admin`. */
export const Role = roleSchema.enum;
