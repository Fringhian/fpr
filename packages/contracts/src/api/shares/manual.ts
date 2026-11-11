import { z } from "zod";
import { errorMap, signedInRoute } from "../../contract.js";
import { isinSchema, shareSummarySchema } from "../../schemas/share.js";
import { timestampSchema } from "../../schemas/time.js";
import {
  shareIdParamsSchema,
  shareNameSchema,
  sharePriceEurSchema,
} from "./schemas.js";

/** `POST /shares/manual`: a manual share and its first value point. */
export const shareManualBodySchema = z.object({
  isin: isinSchema,
  name: shareNameSchema,
  /** The value of one unit at `at`. */
  priceEur: sharePriceEurSchema,
  at: timestampSchema,
});

export type ShareManualBody = z.infer<typeof shareManualBodySchema>;

export const createManualShare = signedInRoute(["admin", "member"])
  .route({
    method: "POST",
    path: "/shares/manual",
    summary: "Create a manual share",
    successStatus: 201,
  })
  .input(shareManualBodySchema)
  .output(shareSummarySchema)
  .errors(
    errorMap("invalid_request", "forbidden", "isin_taken", "future_moment"),
  );

/** `PATCH /shares/{id}`: a manual share's new name, ISIN, or both. */
export const shareUpdateBodySchema = z.object({
  name: shareNameSchema.optional(),
  isin: isinSchema.optional(),
});

export type ShareUpdateBody = z.infer<typeof shareUpdateBodySchema>;

export const updateShare = signedInRoute(["admin", "member"])
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
  .errors(errorMap("invalid_request", "forbidden", "not_found", "isin_taken"));
