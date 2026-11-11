import { z } from "zod";
import { personal } from "../../anonymize.js";
import { errorMap, publicRoute } from "../../contract.js";
import { displayNameSchema } from "../../schemas/person.js";
import { passwordSchema } from "./password.js";

/** Whether `/setup` is still open: it closes once an admin exists. */
export const setupStatusSchema = z.object({
  adminExists: z.boolean(),
});

export type SetupStatus = z.infer<typeof setupStatusSchema>;

/** The first admin, with the `ADMIN_BOOTSTRAP_KEY` value. */
export const setupBodySchema = z.object({
  bootstrapKey: z.string().min(1),
  email: personal(z.email()),
  displayName: personal(displayNameSchema),
  password: passwordSchema,
});

export type SetupBody = z.infer<typeof setupBodySchema>;

export const getSetupStatus = publicRoute
  .route({
    method: "GET",
    path: "/setup",
    summary: "Whether an admin exists, closing the setup",
  })
  .output(setupStatusSchema);

/**
 * Creates the first admin with a claimed access key and starts their session.
 * Refused with `admin_exists` once an admin exists, whatever the key.
 */
export const setUpFirstAdmin = publicRoute
  .route({
    method: "POST",
    path: "/setup",
    summary: "Create the first admin with the bootstrap key",
    successStatus: 201,
  })
  .input(setupBodySchema)
  .output(z.void())
  .errors(
    errorMap(
      "invalid_request",
      "forbidden",
      "admin_exists",
      "invalid_bootstrap_key",
      "rate_limited",
    ),
  );
