import { apiContract, type ShareValue } from "@fpr/contracts";
import type { PricesValuePoint } from "@fpr/contracts/prices";
import { type Db, users } from "@fpr/db";
import { api } from "../implement.js";
import { toPerson } from "../me/me.js";
import { signedIn } from "../pipeline/index.js";
import { forwardRefusal } from "../prices/forward-refusal.js";

const { addValue, updateValue, deleteValue } = apiContract.shares;

async function toShareValue(
  db: Db,
  point: PricesValuePoint,
): Promise<ShareValue> {
  const user =
    point.enteredBy === null
      ? undefined
      : await users.findById(db, point.enteredBy);
  return {
    at: point.at,
    priceEur: point.priceEur,
    enteredBy: user === undefined ? null : toPerson(user),
  };
}

/**
 * The value point routes. Any member and the admin edit any manual share's
 * values: the price service stores each with the viewer as its author, and
 * refuses an edit or deletion whose `expectedPriceEur` is no longer the
 * stored value with `value_changed`.
 */
export const valuePointRoutes = {
  addValue: api.shares.addValue
    .use(signedIn)
    .handler(async ({ context, input }) => {
      const point = await context.prices
        .addManualPrice({ ...input, enteredBy: context.viewer.id })
        .catch(forwardRefusal(addValue, context.req.log));
      context.series.clear();
      return toShareValue(context.db, point);
    }),

  updateValue: api.shares.updateValue
    .use(signedIn)
    .handler(async ({ context, input }) => {
      const point = await context.prices
        .updateManualPrice({ ...input, enteredBy: context.viewer.id })
        .catch(forwardRefusal(updateValue, context.req.log));
      context.series.clear();
      return toShareValue(context.db, point);
    }),

  deleteValue: api.shares.deleteValue
    .use(signedIn)
    .handler(async ({ context, input }) => {
      await context.prices
        .deleteManualPrice({ ...input, deletedBy: context.viewer.id })
        .catch(forwardRefusal(deleteValue, context.req.log));
      context.series.clear();
    }),
};
