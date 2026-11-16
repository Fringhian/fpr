import { apiContract, type MadeBy, type ShareValue } from "@fpr/contracts";
import type { PricesValuePoint } from "@fpr/contracts/prices";
import { type Db, prices, users } from "@fpr/db";
import type { AnyContractProcedure } from "@orpc/contract";
import { ORPCError } from "@orpc/server";
import type { Logger } from "pino";
import { apiError } from "../errors.js";
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

/** Who entered the price stored for a share at a moment, or `null`. */
async function storedAuthor(
  db: Db,
  point: { id: string; at: string },
): Promise<MadeBy> {
  const price = await prices.find(db, point.id, new Date(point.at));
  const user =
    price?.enteredBy == null
      ? undefined
      : await users.findById(db, price.enteredBy);
  return user === undefined
    ? null
    : { id: user.id, displayName: user.displayName };
}

/**
 * `forwardRefusal`, with `value_changed` naming who entered the stored value.
 * Only writers reach these routes, so the name is never an anonymous
 * viewer's to pseudonymize.
 */
function forwardValueRefusal(
  context: { db: Db; req: { log: Logger } },
  route: AnyContractProcedure,
  point: { id: string; at: string },
): (error: unknown) => Promise<never> {
  const forward: (error: unknown) => never = forwardRefusal(
    route,
    context.req.log,
  );
  return async (error) => {
    try {
      forward(error);
    } catch (answer) {
      if (answer instanceof ORPCError && answer.code === "value_changed") {
        throw apiError("value_changed", {
          ...(answer.data as Record<string, unknown>),
          changedBy: await storedAuthor(context.db, point),
        });
      }
      throw answer;
    }
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
        .catch(forwardValueRefusal(context, addValue, input));
      context.series.clear();
      return toShareValue(context.db, point);
    }),

  updateValue: api.shares.updateValue
    .use(signedIn)
    .handler(async ({ context, input }) => {
      const point = await context.prices
        .updateManualPrice({ ...input, enteredBy: context.viewer.id })
        .catch(forwardValueRefusal(context, updateValue, input));
      context.series.clear();
      return toShareValue(context.db, point);
    }),

  deleteValue: api.shares.deleteValue
    .use(signedIn)
    .handler(async ({ context, input }) => {
      await context.prices
        .deleteManualPrice({ ...input, deletedBy: context.viewer.id })
        .catch(forwardValueRefusal(context, deleteValue, input));
      context.series.clear();
    }),
};
