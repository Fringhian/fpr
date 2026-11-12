import { z } from "zod";
import { errorMap, errorWithDetails, signedInRoute } from "../../contract.js";
import { roles, writerRoles } from "../../roles.js";
import { idSchema } from "../../schemas/ids.js";
import { priceEurSchema } from "../../schemas/money.js";
import { personSchema } from "../../schemas/person.js";
import {
  pricePointSchema,
  valueChangedDetailsSchema,
} from "../../schemas/share.js";
import { timestampSchema } from "../../schemas/time.js";
import { shareIdParamsSchema } from "./schemas.js";

/** `value_changed`, with the value point's stored price in `details`. */
const valueChangedError = errorWithDetails(
  "value_changed",
  valueChangedDetailsSchema,
);

/**
 * A manual share's value point: what one unit was worth at a moment, and who
 * last entered or edited it, or `null` once that person is deleted.
 */
export const shareValueSchema = pricePointSchema.extend({
  enteredBy: personSchema.nullable(),
});

export type ShareValue = z.infer<typeof shareValueSchema>;

/** A manual share's value points, newest first. A market share has none. */
export const shareValuesSchema = z.object({
  values: z.array(shareValueSchema),
});

export type ShareValues = z.infer<typeof shareValuesSchema>;

export const getShareValues = signedInRoute(roles)
  .route({
    method: "GET",
    path: "/shares/{id}/values",
    summary: "A manual share's value points",
  })
  .input(shareIdParamsSchema)
  .output(shareValuesSchema)
  .errors(errorMap("invalid_request", "not_found"));

/** What a value edit did to a value point. */
export const shareValueActions = ["added", "edited", "deleted"] as const;

export const shareValueActionSchema = z.enum(shareValueActions);

export type ShareValueAction = z.infer<typeof shareValueActionSchema>;

const action = shareValueActionSchema.enum;

const shareValueEventBaseSchema = z.object({
  id: idSchema,
  /** The moment of the value point concerned. */
  at: timestampSchema,
  /** Who made the edit, or `null` once that person is deleted. */
  madeBy: personSchema.nullable(),
  /** When the edit was made. */
  madeAt: timestampSchema,
});

/**
 * A value edit on a manual share: "Alex set Example Fund to €40.10 for
 * 3 March (was €41.00)". Value points are share prices, so the anonymizer
 * keeps them.
 */
export const shareValueEventSchema = z.discriminatedUnion("action", [
  shareValueEventBaseSchema.extend({
    action: z.literal(action.added),
    priceEur: priceEurSchema,
    previousPriceEur: z.null(),
  }),
  shareValueEventBaseSchema.extend({
    action: z.literal(action.edited),
    priceEur: priceEurSchema,
    previousPriceEur: priceEurSchema,
  }),
  shareValueEventBaseSchema.extend({
    action: z.literal(action.deleted),
    priceEur: z.null(),
    previousPriceEur: priceEurSchema,
  }),
]);

export type ShareValueEvent = z.infer<typeof shareValueEventSchema>;

/** A manual share's value edits, newest first. */
export const shareValueEventsSchema = z.object({
  events: z.array(shareValueEventSchema),
});

export type ShareValueEvents = z.infer<typeof shareValueEventsSchema>;

export const getShareValueEvents = signedInRoute(roles)
  .route({
    method: "GET",
    path: "/shares/{id}/value-events",
    summary: "A manual share's value edits",
  })
  .input(shareIdParamsSchema)
  .output(shareValueEventsSchema)
  .errors(errorMap("invalid_request", "not_found"));

/** `POST /shares/{id}/values` takes a value point: `{ at, priceEur }`. */
export const addShareValue = signedInRoute(writerRoles)
  .route({
    method: "POST",
    path: "/shares/{id}/values",
    summary: "Add a value point to a manual share",
    successStatus: 201,
  })
  .input(shareIdParamsSchema.extend(pricePointSchema.shape))
  .output(shareValueSchema)
  .errors(
    errorMap("invalid_request", "forbidden", "not_found", "future_moment"),
  )
  .errors(valueChangedError);

/**
 * A value point in a path: its share's id and its moment, an ISO 8601
 * timestamp with its offset, percent-encoded as one path segment, such as
 * `/shares/{id}/values/2026-03-02T16%3A30%3A00Z`. The API matches the instant,
 * so `2026-03-02T17:30:00+01:00` names the same value point.
 */
export const shareValueParamsSchema = shareIdParamsSchema.extend({
  at: timestampSchema,
});

export type ShareValueParams = z.infer<typeof shareValueParamsSchema>;

/**
 * `PATCH /shares/{id}/values/{at}`: the new price, and the price the editor
 * last saw.
 */
export const shareValueUpdateBodySchema = z.object({
  priceEur: priceEurSchema,
  expectedPriceEur: priceEurSchema,
});

export type ShareValueUpdateBody = z.infer<typeof shareValueUpdateBodySchema>;

export const updateShareValue = signedInRoute(writerRoles)
  .route({
    method: "PATCH",
    path: "/shares/{id}/values/{at}",
    summary: "Edit a value point's price",
  })
  .input(shareValueParamsSchema.extend(shareValueUpdateBodySchema.shape))
  .output(shareValueSchema)
  .errors(errorMap("invalid_request", "forbidden", "not_found"))
  .errors(valueChangedError);

/** `DELETE /shares/{id}/values/{at}`: the price the editor last saw. */
export const shareValueDeleteBodySchema = z.object({
  expectedPriceEur: priceEurSchema,
});

export type ShareValueDeleteBody = z.infer<typeof shareValueDeleteBodySchema>;

export const deleteShareValue = signedInRoute(writerRoles)
  .route({
    method: "DELETE",
    path: "/shares/{id}/values/{at}",
    summary: "Delete a value point",
    successStatus: 204,
  })
  .input(shareValueParamsSchema.extend(shareValueDeleteBodySchema.shape))
  .output(z.void())
  .errors(
    errorMap("invalid_request", "forbidden", "not_found", "last_value_point"),
  )
  .errors(valueChangedError);
