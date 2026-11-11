import { z } from "zod";
import { personal } from "../../anonymize.js";
import { errorMap, publicRoute } from "../../contract.js";
import { passwordSchema } from "./password.js";

/** Page 1 of a password reset: the person's email and their reset key. */
export const passwordResetCheckBodySchema = z.object({
  email: personal(z.email()),
  key: z.string().min(1),
});

export type PasswordResetCheckBody = z.infer<
  typeof passwordResetCheckBodySchema
>;

/** Page 2 of a password reset: the same pair, and the new password. */
export const passwordResetBodySchema = passwordResetCheckBodySchema.extend({
  password: passwordSchema,
});

export type PasswordResetBody = z.infer<typeof passwordResetBodySchema>;

/**
 * Answers `204` when the pair is valid, and `invalid_reset_key` when the
 * email or key is wrong, or the key used, revoked, or expired, without saying
 * which.
 */
export const checkPasswordReset = publicRoute
  .route({
    method: "POST",
    path: "/password-reset/check",
    summary: "Check an email and reset key pair",
    successStatus: 204,
  })
  .input(passwordResetCheckBodySchema)
  .output(z.void())
  .errors(
    errorMap(
      "invalid_request",
      "forbidden",
      "invalid_reset_key",
      "rate_limited",
    ),
  );

/** Sets the password, uses the reset key, and ends every session of the person. */
export const resetPassword = publicRoute
  .route({
    method: "POST",
    path: "/password-reset",
    summary: "Set a new password with an email and reset key pair",
    successStatus: 204,
  })
  .input(passwordResetBodySchema)
  .output(z.void())
  .errors(
    errorMap(
      "invalid_request",
      "forbidden",
      "invalid_reset_key",
      "rate_limited",
    ),
  );
