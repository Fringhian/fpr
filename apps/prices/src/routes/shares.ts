import type { ShareSummary } from "@fpr/contracts";
import {
  attentionWindowStart,
  type Db,
  prices,
  type Share,
  shares,
  violatedConstraint,
} from "@fpr/db";
import { service } from "../orpc.js";
import { storeValuePoint } from "./value-point.js";

export function toShareSummary(share: Share): ShareSummary {
  return {
    id: share.id,
    isin: share.isin,
    name: share.name,
    kind: share.kind,
    symbol: share.providerSymbol,
  };
}

/**
 * The id of the share that holds `isin`, when `error` is the unique ISIN
 * refusing a write: two writers raced for the same ISIN. `undefined` for any
 * other error.
 */
async function isinTakenBy(
  error: unknown,
  db: Db,
  isin: string | undefined,
): Promise<string | undefined> {
  if (isin === undefined || violatedConstraint(error) !== "shares_isin_key") {
    return undefined;
  }
  return (await shares.findByIsin(db, isin))?.id;
}

/** `POST /shares/manual`: the share, its first value point, and its value edit. */
export const createManual = service.createManual.handler(
  async ({ input, context, errors }) => {
    const at = new Date(input.at);
    if (at > context.now()) {
      throw errors.future_moment();
    }
    const taken = await shares.findByIsin(context.db, input.isin);
    if (taken !== undefined) {
      throw errors.isin_taken({ data: { shareId: taken.id } });
    }

    try {
      const share = await context.db.transaction().execute(async (trx) => {
        const created = await shares.insert(trx, {
          isin: input.isin,
          name: input.name,
          kind: "manual",
          tradingCurrency: null,
          providerSymbol: null,
          exchange: null,
          historyStartsOn: null,
          createdBy: input.createdBy,
        });
        await storeValuePoint(trx, {
          shareId: created.id,
          at,
          priceEur: input.priceEur,
          userId: input.createdBy,
        });
        return created;
      });
      return toShareSummary(share);
    } catch (error) {
      const shareId = await isinTakenBy(error, context.db, input.isin);
      if (shareId !== undefined) {
        throw errors.isin_taken({ data: { shareId } });
      }
      throw error;
    }
  },
);

export const updateShare = service.updateShare.handler(
  async ({ input, context, errors }) => {
    try {
      const share = await context.db.transaction().execute(async (trx) => {
        const current = await shares.lockById(trx, input.id);
        if (current === undefined || current.kind !== "manual") {
          throw errors.not_found();
        }
        if (input.isin !== undefined && input.isin !== current.isin) {
          const taken = await shares.findByIsin(trx, input.isin);
          if (taken !== undefined) {
            throw errors.isin_taken({ data: { shareId: taken.id } });
          }
        }
        return shares.update(trx, input.id, {
          name: input.name,
          isin: input.isin,
        });
      });
      if (share === undefined) {
        throw errors.not_found();
      }
      return toShareSummary(share);
    } catch (error) {
      const shareId = await isinTakenBy(error, context.db, input.isin);
      if (shareId !== undefined) {
        throw errors.isin_taken({ data: { shareId } });
      }
      throw error;
    }
  },
);

/**
 * `DELETE /shares/:id`. The foreign key of `portfolio_changes` refuses it
 * while a share change refers to the share, including one recorded while the
 * delete runs.
 */
export const deleteShare = service.deleteShare.handler(
  async ({ input, context, errors }) => {
    try {
      await context.db.transaction().execute(async (trx) => {
        const share = await shares.lockById(trx, input.id);
        if (share === undefined) {
          throw errors.not_found();
        }
        await shares.remove(trx, input.id);
      });
    } catch (error) {
      if (violatedConstraint(error) === "portfolio_changes_share_id_fkey") {
        throw errors.share_in_use();
      }
      throw error;
    }
  },
);

/**
 * The value point a share turned manual starts with: its latest price, or,
 * for a share with no price, the one given. A share with a price ignores the
 * one given. `undefined` when neither exists.
 */
async function firstValuePoint(
  db: Db,
  input: { id: string; priceEur?: string | undefined; at?: string | undefined },
  now: Date,
): Promise<{ at: Date; priceEur: string } | undefined> {
  const latest = await prices.latestAt(db, input.id, now);
  if (latest !== undefined) {
    return { at: latest.at, priceEur: latest.priceEur };
  }
  if (input.priceEur === undefined || input.at === undefined) {
    return undefined;
  }
  return { at: new Date(input.at), priceEur: input.priceEur };
}

/**
 * `POST /shares/:id/make-manual`: turns a market share that needs attention
 * into a manual share. Its prices stay, and its first value point is entered
 * by the admin.
 */
export const makeManual = service.makeManual.handler(
  async ({ input, context, errors }) => {
    const now = context.now();
    const { timeZone } = context;
    const share = await context.db.transaction().execute(async (trx) => {
      if ((await shares.lockById(trx, input.id)) === undefined) {
        throw errors.not_found();
      }
      const since = attentionWindowStart(now, timeZone);
      if (!(await shares.needsAttention(trx, input.id, since, timeZone))) {
        throw errors.share_not_needing_attention();
      }
      const point = await firstValuePoint(trx, input, now);
      if (point === undefined) {
        throw errors.invalid_request({
          data: {
            issues: [
              { path: ["priceEur"], code: "invalid_type" },
              { path: ["at"], code: "invalid_type" },
            ],
          },
        });
      }
      if (point.at > now) {
        throw errors.future_moment();
      }
      const updated = await shares.update(trx, input.id, {
        kind: "manual",
        tradingCurrency: null,
        providerSymbol: null,
        exchange: null,
      });
      await storeValuePoint(trx, {
        shareId: input.id,
        ...point,
        userId: input.enteredBy,
      });
      return updated;
    });
    if (share === undefined) {
      throw errors.not_found();
    }
    return toShareSummary(share);
  },
);
