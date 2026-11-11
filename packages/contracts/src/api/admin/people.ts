import { z } from "zod";
import { personal } from "../../anonymize.js";
import { errorMap, signedInRoute } from "../../contract.js";
import { roleSchema } from "../../roles.js";
import { idSchema } from "../../schemas/ids.js";
import { displayNameSchema, personSchema } from "../../schemas/person.js";
import { timestampSchema } from "../../schemas/time.js";

/**
 * Where a person's access stands, from the key that gives it, checked in this
 * order:
 * - `revoked`: the admin revoked it;
 * - `ended`: `access_until` has passed;
 * - `expired`: never used, and `claim_before` has passed;
 * - `waiting`: waiting for its first use;
 * - `active`: claimed, so the person can sign in.
 */
export const adminAccessStatuses = [
  "waiting",
  "active",
  "expired",
  "revoked",
  "ended",
] as const;

export const adminAccessStatusSchema = z.enum(adminAccessStatuses);

export type AdminAccessStatus = z.infer<typeof adminAccessStatusSchema>;

/** The roles a person moves between. Nobody becomes or stops being `anonymous`. */
export const adminChangeableRoleSchema = roleSchema.exclude(["anonymous"]);

/**
 * The link that gives a person access: `<PUBLIC_URL>/access/<key>`. A secret,
 * returned once and never logged or stored: only the key's hash is stored.
 */
export const adminAccessLinkSchema = z.url();

/** A person as the admin area lists them. */
export const adminPersonSchema = personSchema.extend({
  role: roleSchema,
  /** The sign-in email, or `null` for an anonymous viewer, who has none. */
  email: personal(z.email().nullable()),
  accessStatus: adminAccessStatusSchema,
  /** The deadline for the key's first use. */
  claimBefore: timestampSchema,
  /** When access ends, or `null` for no end. */
  accessUntil: timestampSchema.nullable(),
  /** Whether the person has a share change or cash balance: they can't become a guest. */
  hasPortfolioEntries: z.boolean(),
});

export type AdminPerson = z.infer<typeof adminPersonSchema>;

/** A person and their access link, shown once. */
export const adminPersonWithLinkSchema = z.object({
  person: adminPersonSchema,
  accessLink: adminAccessLinkSchema,
});

export type AdminPersonWithLink = z.infer<typeof adminPersonWithLinkSchema>;

const personFields = {
  displayName: displayNameSchema,
  /** When access ends, or `null` for no end. A moment in the past is refused. */
  accessUntil: timestampSchema.nullable().optional(),
};

/**
 * A person to add. A password user signs in with their email; an anonymous
 * viewer has none, and gets a generated one nobody sees. The colour is the
 * first one nobody has.
 */
export const adminAddPersonSchema = z.discriminatedUnion("role", [
  z.object({
    ...personFields,
    role: adminChangeableRoleSchema,
    email: z.email(),
  }),
  z.object({ ...personFields, role: z.literal("anonymous") }),
]);

export type AdminAddPerson = z.infer<typeof adminAddPersonSchema>;

/**
 * The fields to change on a person. An `accessUntil` in the past ends their
 * access. Setting `role` to `anonymous`, or any role on an anonymous viewer, is
 * refused with `anonymous_role_fixed`.
 */
export const adminUpdatePersonSchema = z.object({
  id: idSchema,
  displayName: displayNameSchema.optional(),
  /** Refused for an anonymous viewer, who has no email. */
  email: z.email().optional(),
  role: roleSchema.optional(),
  accessUntil: timestampSchema.nullable().optional(),
});

export type AdminUpdatePerson = z.infer<typeof adminUpdatePersonSchema>;

const adminRoute = signedInRoute(["admin"]);

export const adminPeople = signedInRoute(["admin", "anonymous"])
  .route({
    method: "GET",
    path: "/admin/people",
    summary: "Every person, their role, and their access status",
  })
  .output(z.array(adminPersonSchema))
  .errors(errorMap("forbidden"));

export const adminAddPerson = adminRoute
  .route({
    method: "POST",
    path: "/admin/people",
    summary: "Add a person, and return their access link once",
    successStatus: 201,
  })
  .input(adminAddPersonSchema)
  .output(adminPersonWithLinkSchema)
  .errors(errorMap("invalid_request", "forbidden", "email_taken"));

export const adminUpdatePerson = adminRoute
  .route({
    method: "PATCH",
    path: "/admin/people/{id}",
    summary: "Change a person's display name, email, role, or access end date",
  })
  .input(adminUpdatePersonSchema)
  .output(adminPersonSchema)
  .errors(
    errorMap(
      "invalid_request",
      "forbidden",
      "not_found",
      "email_taken",
      "last_admin",
      "has_portfolio_entries",
      "anonymous_role_fixed",
    ),
  );

export const adminDeletePerson = adminRoute
  .route({
    method: "DELETE",
    path: "/admin/people/{id}",
    summary: "Delete a person and their data",
    successStatus: 204,
  })
  .input(z.object({ id: idSchema }))
  .output(z.void())
  .errors(errorMap("invalid_request", "forbidden", "not_found", "last_admin"));
