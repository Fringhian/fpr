import type { PricesValuePoint } from "@fpr/contracts/prices";
import { manualPriceEvents, type Price, prices, shares } from "@fpr/db";
import Big from "big.js";
import { service } from "../orpc.js";
import { storeValuePoint } from "./value-point.js";

function toValuePoint(price: Price): PricesValuePoint {
  return {
    at: price.at.toISOString(),
    priceEur: price.priceEur,
    enteredBy: price.enteredBy,
  };
}

/**
 * Locks a manual share and reads its value point at `at`. Resolves with
 * `undefined` for a missing or market share, or no value point there.
 */
async function lockValuePoint(
  trx: Parameters<typeof shares.lockById>[0],
  shareId: string,
  at: Date,
): Promise<Price | undefined> {
  const share = await shares.lockById(trx, shareId);
  if (share === undefined || share.kind !== "manual") {
    return undefined;
  }
  const price = await prices.find(trx, shareId, at);
  return price?.source === "manual" ? price : undefined;
}

/**
 * `POST /shares/:id/manual-prices`. Any price already stored at that moment
 * refuses it with `value_changed`.
 */
export const addManualPrice = service.addManualPrice.handler(
  async ({ input, context, errors }) => {
    const at = new Date(input.at);
    if (at > context.now()) {
      throw errors.future_moment();
    }
    return context.db.transaction().execute(async (trx) => {
      const share = await shares.lockById(trx, input.id);
      if (share === undefined || share.kind !== "manual") {
        throw errors.not_found();
      }
      const stored = await prices.find(trx, input.id, at);
      if (stored !== undefined) {
        throw errors.value_changed({ data: { priceEur: stored.priceEur } });
      }
      const price = await storeValuePoint(trx, {
        shareId: input.id,
        at,
        priceEur: input.priceEur,
        userId: input.enteredBy,
      });
      return toValuePoint(price);
    });
  },
);

/**
 * `PATCH /shares/:id/manual-prices/:at`: refused with `value_changed` when
 * the stored price is no longer the one the member saw.
 */
export const updateManualPrice = service.updateManualPrice.handler(
  async ({ input, context, errors }) => {
    const at = new Date(input.at);
    return context.db.transaction().execute(async (trx) => {
      const stored = await lockValuePoint(trx, input.id, at);
      if (stored === undefined) {
        throw errors.not_found();
      }
      if (!new Big(stored.priceEur).eq(input.expectedPriceEur)) {
        throw errors.value_changed({ data: { priceEur: stored.priceEur } });
      }
      const price = await storeValuePoint(trx, {
        shareId: input.id,
        at,
        priceEur: input.priceEur,
        userId: input.enteredBy,
        previousPriceEur: stored.priceEur,
      });
      return toValuePoint(price);
    });
  },
);

/**
 * `DELETE /shares/:id/manual-prices/:at`: refused with `value_changed` as an
 * edit is, and with `last_value_point` for the share's only one.
 */
export const deleteManualPrice = service.deleteManualPrice.handler(
  async ({ input, context, errors }) => {
    const at = new Date(input.at);
    await context.db.transaction().execute(async (trx) => {
      const stored = await lockValuePoint(trx, input.id, at);
      if (stored === undefined) {
        throw errors.not_found();
      }
      if (!new Big(stored.priceEur).eq(input.expectedPriceEur)) {
        throw errors.value_changed({ data: { priceEur: stored.priceEur } });
      }
      if ((await prices.count(trx, input.id, "manual")) <= 1) {
        throw errors.last_value_point();
      }
      await prices.remove(trx, input.id, at);
      await manualPriceEvents.insert(trx, {
        shareId: input.id,
        at,
        action: "deleted",
        priceEur: null,
        previousPriceEur: stored.priceEur,
        userId: input.deletedBy,
      });
    });
  },
);
