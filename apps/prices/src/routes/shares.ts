import { manualPriceEvents, prices, shares, violatedConstraint } from "@fpr/db";
import { service } from "../orpc.js";
import { attentionWindowStart } from "../trading-day.js";
import { isinTakenBy, toShareSummary } from "./rows.js";

/**
 * `POST /shares/manual`: a manual share with its first value point, entered
 * by its creator, and the `added` value edit, in one transaction.
 */
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
        await prices.upsert(trx, {
          shareId: created.id,
          at,
          priceEur: input.priceEur,
          source: "manual",
          enteredBy: input.createdBy,
        });
        await manualPriceEvents.insert(trx, {
          shareId: created.id,
          at,
          action: "added",
          priceEur: input.priceEur,
          previousPriceEur: null,
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

/** `PATCH /shares/:id`: a manual share's new name, ISIN, or both. */
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
 * `DELETE /shares/:id`: a share with its prices and value edits. The foreign
 * key of `portfolio_changes` refuses it while a share change refers to it,
 * including one recorded while the delete runs.
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
 * `POST /shares/:id/make-manual`: turns a market share that needs attention
 * into a manual share. Its prices stay, and its latest price becomes a
 * `manual` value point entered by the admin. A share with no price takes the
 * given `{ priceEur, at }` instead, which a share with a price ignores.
 */
export const makeManual = service.makeManual.handler(
  async ({ input, context, errors }) => {
    const now = context.now();
    const share = await context.db.transaction().execute(async (trx) => {
      const current = await shares.lockById(trx, input.id);
      if (current === undefined) {
        throw errors.not_found();
      }
      const attention = await shares.needsAttention(
        trx,
        input.id,
        attentionWindowStart(now, context.timeZone),
        context.timeZone,
      );
      if (!attention) {
        throw errors.share_not_needing_attention();
      }

      const latest = await prices.latest(trx, input.id);
      let point: { at: Date; priceEur: string };
      if (latest !== undefined) {
        point = { at: latest.at, priceEur: latest.priceEur };
      } else if (input.priceEur === undefined || input.at === undefined) {
        throw errors.invalid_request({
          data: {
            issues: [
              { path: ["priceEur"], code: "invalid_type" },
              { path: ["at"], code: "invalid_type" },
            ],
          },
        });
      } else {
        point = { at: new Date(input.at), priceEur: input.priceEur };
        if (point.at > now) {
          throw errors.future_moment();
        }
      }

      const updated = await shares.update(trx, input.id, {
        kind: "manual",
        tradingCurrency: null,
        providerSymbol: null,
        exchange: null,
      });
      await prices.upsert(trx, {
        shareId: input.id,
        at: point.at,
        priceEur: point.priceEur,
        source: "manual",
        enteredBy: input.enteredBy,
      });
      await manualPriceEvents.insert(trx, {
        shareId: input.id,
        at: point.at,
        action: "added",
        priceEur: point.priceEur,
        previousPriceEur: null,
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
