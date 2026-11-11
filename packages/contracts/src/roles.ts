import { z } from "zod";

/** Every role a person can have. */
export const roles = ["admin", "member", "guest", "anonymous"] as const;

export const roleSchema = z.enum(roles);

export type Role = z.infer<typeof roleSchema>;

/** Each role by name, such as `Role.admin`. */
export const Role = roleSchema.enum;

/** The admin alone: people, access, and the price service. */
export const adminRoles = [Role.admin] as const;

/** The roles that read the admin area: the admin, and anonymous viewers read-only. */
export const adminAreaRoles = [Role.admin, Role.anonymous] as const;

/**
 * The roles that write portfolios and shares: a member their own portfolio,
 * the admin anyone's, and both manual shares and lookups.
 */
export const writerRoles = [Role.admin, Role.member] as const;

/**
 * The roles with a profile: they edit their own and see everyone's pictures.
 * Everyone but anonymous viewers.
 */
export const profileRoles = [Role.admin, Role.member, Role.guest] as const;
