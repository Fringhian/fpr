import { z } from "zod";
import { errorMap, signedInRoute } from "../../contract.js";
import { adminAreaRoles, adminRoles } from "../../roles.js";
import { idSchema } from "../../schemas/ids.js";
import { priceEurSchema } from "../../schemas/money.js";
import { personSchema } from "../../schemas/person.js";
import { latestPriceSchema, shareSummarySchema } from "../../schemas/share.js";
import { timestampSchema } from "../../schemas/time.js";

/** A stored share as the admin area lists it. */
export const adminShareSchema = shareSummarySchema.extend({
  /** Its latest price with its time and source, or `null` when it has none. */
  latestPrice: latestPriceSchema.nullable(),
  /** The people who hold it now. */
  holders: z.array(personSchema),
  /** Whether a share change refers to it: such a share can't be deleted. */
  hasShareChanges: z.boolean(),
});

export type AdminShare = z.infer<typeof adminShareSchema>;

/**
 * Every stored share, each in one group:
 * - `needsAttention`: a held market share with no price, or a latest close
 *   older than the last trading day;
 * - `tracked`: every other held market share;
 * - `manual`: every manual share, held or not;
 * - `notHeld`: a market share nobody holds.
 */
export const adminShareGroupsSchema = z.object({
  needsAttention: z.array(adminShareSchema),
  tracked: z.array(adminShareSchema),
  manual: z.array(adminShareSchema),
  notHeld: z.array(adminShareSchema),
});

export type AdminShareGroups = z.infer<typeof adminShareGroupsSchema>;

/**
 * A share to make manual. Its latest price becomes its first value point;
 * a share with no price takes `priceEur` and `at` as its first value, and is
 * refused with `invalid_request` without them.
 */
export const adminMakeManualSchema = z
  .object({
    id: idSchema,
    priceEur: priceEurSchema.optional(),
    at: timestampSchema.optional(),
  })
  .refine(
    ({ priceEur, at }) => (priceEur === undefined) === (at === undefined),
    {
      error: "priceEur and at go together",
      path: ["at"],
    },
  );

export type AdminMakeManual = z.infer<typeof adminMakeManualSchema>;

export const adminShares = signedInRoute(adminAreaRoles)
  .route({
    method: "GET",
    path: "/admin/shares",
    summary:
      "Every stored share, grouped by what the price service does with it",
  })
  .output(adminShareGroupsSchema)
  .errors(errorMap("forbidden"));

/** Can't be undone. The share's past prices stay. */
export const adminMakeManual = signedInRoute(adminRoles)
  .route({
    method: "POST",
    path: "/admin/shares/{id}/make-manual",
    summary: "Turn a market share that needs attention into a manual share",
  })
  .input(adminMakeManualSchema)
  .output(adminShareSchema)
  .errors(
    errorMap(
      "invalid_request",
      "forbidden",
      "not_found",
      "share_not_needing_attention",
      "future_moment",
    ),
  );
