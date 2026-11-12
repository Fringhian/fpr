import { z } from "zod";
import { errorMap, signedInRoute } from "../../contract.js";
import { adminRoles } from "../../roles.js";
import { resetKeySchema } from "../../schemas/access.js";
import { idSchema } from "../../schemas/ids.js";
import { timestampSchema } from "../../schemas/time.js";
import { adminPersonSchema, adminPersonWithLinkSchema } from "./people.js";

/** A reset key, shown once, with the moment it stops working: 24 hours on. */
export const adminResetKeyResultSchema = z.object({
  resetKey: resetKeySchema,
  expiresAt: timestampSchema,
});

export type AdminResetKeyResult = z.infer<typeof adminResetKeyResultSchema>;

const personInput = z.object({ id: idSchema });

const adminRoute = signedInRoute(adminRoles);

export const adminRevoke = adminRoute
  .route({
    method: "POST",
    path: "/admin/people/{id}/revoke",
    summary: "Revoke a person's access, and end their sessions",
  })
  .input(personInput)
  .output(adminPersonSchema)
  .errors(errorMap("invalid_request", "forbidden", "not_found", "last_admin"));

export const adminRestore = adminRoute
  .route({
    method: "POST",
    path: "/admin/people/{id}/restore",
    summary: "Restore a person's revoked access",
  })
  .input(personInput)
  .output(adminPersonSchema)
  .errors(errorMap("invalid_request", "forbidden", "not_found"));

/**
 * Revokes the person's key and creates a new one, waiting for first use, with
 * the same `accessUntil`.
 */
export const adminReplaceLink = adminRoute
  .route({
    method: "POST",
    path: "/admin/people/{id}/replace-link",
    summary: "Replace a person's access link, and return the new one once",
  })
  .input(personInput)
  .output(adminPersonWithLinkSchema)
  .errors(errorMap("invalid_request", "forbidden", "not_found", "last_admin"));

/**
 * Replaces any unused reset key of the person. An anonymous viewer has no
 * password, so a reset key for one is refused with `forbidden`.
 */
export const adminResetKey = adminRoute
  .route({
    method: "POST",
    path: "/admin/people/{id}/reset-key",
    summary: "Generate a password reset key, and return it once",
  })
  .input(personInput)
  .output(adminResetKeyResultSchema)
  .errors(errorMap("invalid_request", "forbidden", "not_found"));
