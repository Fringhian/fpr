import { z } from "zod";
import { personal } from "../../anonymize.js";
import { errorMap, errorWithDetails, publicRoute } from "../../contract.js";
import { accessKeySchema, passwordSchema } from "../../schemas/access.js";
import { displayNameSchema, emailSchema } from "../../schemas/person.js";

/**
 * What an access key is now:
 * - `waiting`: never used, before its first-use deadline;
 * - `claimed`: used, and giving access;
 * - `expired`: never used, past its first-use deadline;
 * - `replaced`: revoked by a newer link for the same person;
 * - `revoked`: revoked by the admin;
 * - `ended`: past the person's access end date;
 * - `unknown`: no such key.
 */
export const accessKeyStates = [
  "waiting",
  "claimed",
  "expired",
  "replaced",
  "revoked",
  "ended",
  "unknown",
] as const;

export const accessKeyStateSchema = z.enum(accessKeyStates);

export type AccessKeyState = z.infer<typeof accessKeyStateSchema>;

const state = accessKeyStateSchema.enum;

/**
 * How the key's person gets in: `password` for an admin, member, or guest,
 * `link` for an anonymous viewer, who signs in with the key itself.
 */
export const accessSignInMethods = ["password", "link"] as const;

export const accessSignInMethodSchema = z.enum(accessSignInMethods);

export type AccessSignInMethod = z.infer<typeof accessSignInMethodSchema>;

const signInMethod = accessSignInMethodSchema.enum;

/** The `details` of `invalid_access_key`: the key's state. */
export const accessKeyErrorDetailsSchema = z.object({
  state: accessKeyStateSchema,
});

export type AccessKeyErrorDetails = z.infer<typeof accessKeyErrorDetailsSchema>;

/** `invalid_access_key`, with the key's state in `details`. */
const invalidAccessKeyError = errorWithDetails(
  "invalid_access_key",
  accessKeyErrorDetailsSchema,
);

export const accessCheckBodySchema = z.object({
  key: accessKeySchema,
});

export type AccessCheckBody = z.infer<typeof accessCheckBodySchema>;

/**
 * A key's state. A waiting key of a password user also says who it is for,
 * and whether they already have a password, from an earlier link.
 */
export const accessCheckResponseSchema = z.discriminatedUnion("state", [
  z.discriminatedUnion("signsInWith", [
    z.object({
      state: z.literal(state.waiting),
      signsInWith: z.literal(signInMethod.password),
      email: personal(emailSchema),
      displayName: personal(displayNameSchema),
      hasPassword: z.boolean(),
    }),
    z.object({
      state: z.literal(state.waiting),
      signsInWith: z.literal(signInMethod.link),
    }),
  ]),
  z.object({
    state: accessKeyStateSchema.exclude([state.waiting, state.unknown]),
    signsInWith: accessSignInMethodSchema,
  }),
  z.object({
    state: z.literal(state.unknown),
  }),
]);

export type AccessCheckResponse = z.infer<typeof accessCheckResponseSchema>;

/**
 * A waiting key of a password user. `password` is required when the person
 * has none, and refused with `invalid_request` when they already have one.
 */
export const accessClaimBodySchema = z.object({
  key: accessKeySchema,
  password: passwordSchema.optional(),
});

export type AccessClaimBody = z.infer<typeof accessClaimBodySchema>;

/**
 * `signedIn` is `true` when the claim set the password and started a session,
 * and `false` when the person already had a password and signs in with it.
 */
export const accessClaimResponseSchema = z.object({
  signedIn: z.boolean(),
});

export type AccessClaimResponse = z.infer<typeof accessClaimResponseSchema>;

export const accessSignInBodySchema = z.object({
  key: accessKeySchema,
});

export type AccessSignInBody = z.infer<typeof accessSignInBodySchema>;

export const checkAccessKey = publicRoute
  .route({
    method: "POST",
    path: "/access/check",
    summary: "An access key's state, and who it is for while waiting",
  })
  .input(accessCheckBodySchema)
  .output(accessCheckResponseSchema)
  .errors(errorMap("invalid_request", "forbidden", "rate_limited"));

/**
 * Claims a waiting key of a password user. Refused with `invalid_access_key`
 * for a key that isn't waiting, or that is an anonymous viewer's.
 */
export const claimAccessKey = publicRoute
  .route({
    method: "POST",
    path: "/access/claim",
    summary: "Claim an access link, setting the password on first use",
  })
  .input(accessClaimBodySchema)
  .output(accessClaimResponseSchema)
  .errors(errorMap("invalid_request", "forbidden", "rate_limited"))
  .errors(invalidAccessKeyError);

/**
 * Signs an anonymous viewer in with their key, and records the first visit.
 * Refused with `invalid_access_key` for a key that is neither waiting nor
 * claimed, or that is a password user's.
 */
export const signInWithAccessKey = publicRoute
  .route({
    method: "POST",
    path: "/access/sign-in",
    summary: "Sign an anonymous viewer in with their access link",
    successStatus: 204,
  })
  .input(accessSignInBodySchema)
  .output(z.void())
  .errors(errorMap("invalid_request", "forbidden", "rate_limited"))
  .errors(invalidAccessKeyError);
