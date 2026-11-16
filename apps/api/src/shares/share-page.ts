import {
  type Period,
  type ShareDetail,
  type ShareHolders,
  type SharePrices,
  writerRoles,
} from "@fpr/contracts";
import { type Db, type Share, shares, shareValues } from "@fpr/db";
import { apiError } from "../errors.js";
import { toPerson } from "../me/me.js";
import type { ApiServices } from "../orpc.js";
import type { Viewer } from "../pipeline/index.js";
import { type LogContext, weighEntries } from "../portfolio/log.js";
import { Big } from "../valuation/decimal.js";
import { raceMembers, raceWindow } from "../valuation/race-window.js";
import { positionOf, sharePositions } from "./positions.js";
import { chartPoints, shareQuotes } from "./quotes.js";

type ReadServices = Pick<ApiServices, "db" | "series" | "raceTimeZone">;

async function findShare(db: Db, id: string): Promise<Share> {
  const share = await shares.findById(db, id);
  if (share === undefined) {
    throw apiError("not_found");
  }
  return share;
}

/** `GET /shares/{id}?period=`: the share, its price, and the viewer's position on it. */
export async function readShare(
  context: ReadServices,
  viewer: Viewer,
  input: { id: string; period: Period },
): Promise<ShareDetail> {
  const share = await findShare(context.db, input.id);
  const ranked = (writerRoles as readonly string[]).includes(viewer.role);
  const [{ quote }, positions] = await Promise.all([
    shareQuotes(context, [share.id], input.period),
    ranked ? sharePositions(context.db, share.id, context.raceTimeZone) : null,
  ]);
  return {
    ...quote(share),
    exchange: share.exchange,
    tradingCurrency: share.tradingCurrency,
    historyStartsOn: share.historyStartsOn,
    position: positions === null ? null : positionOf(positions, viewer.id),
  };
}

/**
 * `GET /shares/{id}/prices?range=`: every price after the range's start for
 * `1D` and `1W`, its closes and value points otherwise, and none for a share
 * nobody has held.
 */
export async function readSharePrices(
  context: ReadServices,
  input: { id: string; range: Period },
): Promise<SharePrices> {
  const share = await findShare(context.db, input.id);
  if (!(await shareValues.everHeld(context.db, share.id))) {
    return { points: [] };
  }
  const window = await raceWindow(context, input.range);
  const intraday = input.range === "1D" || input.range === "1W";
  const points = await chartPoints(context, [share.id], {
    window,
    period: input.range,
    intraday: intraday ? "period" : "none",
  });
  return { points: points.get(share.id) ?? [] };
}

/**
 * `GET /shares/{id}/holders`: each member with changes on the share, their
 * changes, and their position now, largest first. A member who sold it all
 * holds zero, with no value or gain.
 */
export async function readShareHolders(
  context: ReadServices & LogContext,
  input: { id: string },
): Promise<ShareHolders> {
  const share = await findShare(context.db, input.id);
  const [members, positions] = await Promise.all([
    raceMembers(context.db),
    sharePositions(context.db, share.id, context.raceTimeZone),
  ]);
  await Promise.all(
    [...positions.changes].map(([userId, changes]) =>
      weighEntries(
        context,
        userId,
        changes.map(({ id }) => id),
      ),
    ),
  );
  const holders = members.flatMap((member) => {
    const changes = positions.changes.get(member.id) ?? [];
    if (changes.length === 0) {
      return [];
    }
    const position = positionOf(positions, member.id);
    return [
      {
        ...(position ?? {
          quantity: "0",
          valueEur: null,
          weight: null,
          gain: null,
        }),
        person: toPerson(member),
        changes: changes.map(({ id, quantityDelta, effectiveAt }) => ({
          id,
          quantityDelta,
          effectiveAt: effectiveAt.toISOString(),
        })),
      },
    ];
  });
  const value = (holder: (typeof holders)[number]) =>
    new Big(holder.valueEur ?? -1);
  return { holders: holders.sort((a, b) => value(b).cmp(value(a))) };
}
