import { z } from "zod";
import { quantity } from "../../anonymize.js";
import { errorMap, signedInRoute } from "../../contract.js";
import { decimalSchema } from "../../decimal.js";
import { periodSchema } from "../../period.js";
import { adminRoles, roles } from "../../roles.js";
import { idSchema } from "../../schemas/ids.js";
import { currencySchema } from "../../schemas/money.js";
import { positionSchema } from "../../schemas/performance.js";
import { personSchema } from "../../schemas/person.js";
import { pricePointSchema } from "../../schemas/share.js";
import { dateSchema, timestampSchema } from "../../schemas/time.js";
import { shareIdParamsSchema, shareQuoteSchema } from "./schemas.js";

/** A share's page. */
export const shareDetailSchema = shareQuoteSchema.extend({
  /** The exchange of the listing FPR prices, or `null` for a manual share. */
  exchange: z.string().nullable(),
  /** The currency the provider quotes the share in, or `null` for a manual share. */
  tradingCurrency: currencySchema.nullable(),
  /** The day the provider's history starts, when it starts after the share's first holding. */
  historyStartsOn: dateSchema.nullable(),
  /**
   * The signed-in member's position, its gain since they bought, each
   * purchase valued at the share's price on its day, or `null` when they hold
   * none or have no portfolio.
   */
  position: positionSchema.nullable(),
});

export type ShareDetail = z.infer<typeof shareDetailSchema>;

/** `GET /shares/{id}?period=`. */
export const shareQuerySchema = shareIdParamsSchema.extend({
  period: periodSchema,
});

export type ShareQuery = z.input<typeof shareQuerySchema>;

export const getShare = signedInRoute(roles)
  .route({ method: "GET", path: "/shares/{id}", summary: "A share's page" })
  .input(shareQuerySchema)
  .output(shareDetailSchema)
  .errors(errorMap("invalid_request", "not_found"));

/**
 * A share's chart points over the range: intraday points for `1D` and `1W`,
 * daily closes otherwise, oldest first. Empty for a share nobody has held.
 */
export const sharePricesSchema = z.object({
  points: z.array(pricePointSchema),
});

export type SharePrices = z.infer<typeof sharePricesSchema>;

/** `GET /shares/{id}/prices?range=`. */
export const sharePricesQuerySchema = shareIdParamsSchema.extend({
  range: periodSchema,
});

export type SharePricesQuery = z.input<typeof sharePricesQuerySchema>;

export const getSharePrices = signedInRoute(roles)
  .route({
    method: "GET",
    path: "/shares/{id}/prices",
    summary: "A share's chart points",
  })
  .input(sharePricesQuerySchema)
  .output(sharePricesSchema)
  .errors(errorMap("invalid_request", "not_found"));

/** A member's share change, for a chart marker. */
export const shareHolderChangeSchema = z.object({
  id: idSchema,
  quantityDelta: quantity(decimalSchema),
  effectiveAt: timestampSchema,
});

export type ShareHolderChange = z.infer<typeof shareHolderChangeSchema>;

/**
 * A member with share changes on the share, and their position on it now,
 * its gain since they bought.
 */
export const shareHolderSchema = positionSchema.extend({
  person: personSchema,
  /** Oldest first. */
  changes: z.array(shareHolderChangeSchema),
});

export type ShareHolder = z.infer<typeof shareHolderSchema>;

export const shareHoldersSchema = z.object({
  holders: z.array(shareHolderSchema),
});

export type ShareHolders = z.infer<typeof shareHoldersSchema>;

export const getShareHolders = signedInRoute(roles)
  .route({
    method: "GET",
    path: "/shares/{id}/holders",
    summary: "Each member's changes and result on a share",
  })
  .input(shareIdParamsSchema)
  .output(shareHoldersSchema)
  .errors(errorMap("invalid_request", "not_found"));

export const deleteShare = signedInRoute(adminRoles)
  .route({
    method: "DELETE",
    path: "/shares/{id}",
    summary: "Delete a share no share change refers to",
    successStatus: 204,
  })
  .input(shareIdParamsSchema)
  .output(z.void())
  .errors(
    errorMap("invalid_request", "forbidden", "not_found", "share_in_use"),
  );
