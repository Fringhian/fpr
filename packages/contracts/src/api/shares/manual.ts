import { z } from "zod";
import { errorMap, errorWithDetails, signedInRoute } from "../../contract.js";
import { writerRoles } from "../../roles.js";
import { priceEurSchema } from "../../schemas/money.js";
import {
  isinSchema,
  isinTakenDetailsSchema,
  shareNameSchema,
  shareSummarySchema,
} from "../../schemas/share.js";
import { timestampSchema } from "../../schemas/time.js";
import { shareIdParamsSchema } from "./schemas.js";

/** `isin_taken`, with the share that has the ISIN in `details`. */
const isinTakenError = errorWithDetails("isin_taken", isinTakenDetailsSchema);

/** `POST /shares/manual`: a manual share and its first value point. */
export const shareManualBodySchema = z.object({
  isin: isinSchema,
  name: shareNameSchema,
  /** The value of one unit at `at`. */
  priceEur: priceEurSchema,
  at: timestampSchema,
});

export type ShareManualBody = z.infer<typeof shareManualBodySchema>;

export const createManualShare = signedInRoute(writerRoles)
  .route({
    method: "POST",
    path: "/shares/manual",
    summary: "Create a manual share",
    successStatus: 201,
  })
  .input(shareManualBodySchema)
  .output(shareSummarySchema)
  .errors(errorMap("invalid_request", "forbidden", "future_moment"))
  .errors(isinTakenError);

/** `PATCH /shares/{id}`: a manual share's new name, ISIN, or both. */
export const shareUpdateBodySchema = z.object({
  name: shareNameSchema.optional(),
  isin: isinSchema.optional(),
});

export type ShareUpdateBody = z.infer<typeof shareUpdateBodySchema>;

export const updateShare = signedInRoute(writerRoles)
  .route({
    method: "PATCH",
    path: "/shares/{id}",
    summary: "Edit a manual share's name or ISIN",
  })
  .input(
    shareIdParamsSchema
      .extend(shareUpdateBodySchema.shape)
      .refine((input) => input.name !== undefined || input.isin !== undefined, {
        error: "Expected a name or an ISIN",
      }),
  )
  .output(shareSummarySchema)
  .errors(errorMap("invalid_request", "forbidden", "not_found"))
  .errors(isinTakenError);
