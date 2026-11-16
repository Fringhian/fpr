import type {
  Gain,
  Period,
  Portfolio,
  PortfolioHolding,
  PricePoint,
} from "@fpr/contracts";
import {
  type Balance,
  type CashBalance,
  type ChangeAtDayValue,
  cashBalances,
  currentPositions,
  type ShareValue,
  shareValues,
  valuation,
} from "@fpr/db";
import type { ApiServices } from "../orpc.js";
import { chartPoints } from "../shares/quotes.js";
import { toLatestPrice, toShareSummary } from "../shares/share-summary.js";
import { Big, money, plain, ratio, toGain } from "../valuation/decimal.js";
import { groupChanges, periodGain } from "../valuation/holding-gains.js";
import { type HoldingNow, holdingsNow } from "../valuation/holdings-now.js";
import {
  dayIn,
  measuredFrom,
  type RaceWindow,
  raceWindow,
  windowPoints,
  withGains,
} from "../valuation/race-window.js";
import { findPortfolioOwner } from "./owner.js";

type ReadServices = Pick<ApiServices, "db" | "series" | "raceTimeZone">;

/** What a holding's view reads beside the holding. */
interface HoldingContext {
  window: RaceWindow;
  balance: Big;
  changes: Map<string, ChangeAtDayValue[]>;
  starts: Map<string, ShareValue>;
  firsts: Map<string, ShareValue>;
  series: Map<string, PricePoint[]>;
  timeZone: string;
}

/** The day the share's prices start, when the holding starts before it. */
function pricesFrom(
  changes: readonly ChangeAtDayValue[],
  first: ShareValue | undefined,
  timeZone: string,
): string | null {
  const [bought] = changes;
  if (bought === undefined || first === undefined) {
    return null;
  }
  const day = dayIn(timeZone, first.at);
  return dayIn(timeZone, bought.effectiveAt) < day ? day : null;
}

function toHolding(
  holding: HoldingNow,
  context: HoldingContext,
): PortfolioHolding {
  const { share, valueEur, value } = holding;
  const changes = context.changes.get(share.id) ?? [];
  const gain = periodGain({
    changes,
    from: context.window.startAt,
    to: null,
    startPrice: context.starts.get(share.id)?.priceEur ?? null,
    endPrice: value?.priceEur ?? null,
  });
  return {
    share: toShareSummary(share),
    quantity: plain(holding.quantity),
    valueEur: valueEur === null ? null : money(valueEur),
    weight: valueEur === null ? null : ratio(valueEur, context.balance),
    gain: valueEur === null || gain === null ? null : toGain(gain),
    latestPrice: toLatestPrice(value),
    pricesFrom: pricesFrom(
      changes,
      context.firsts.get(share.id),
      context.timeZone,
    ),
    series: context.series.get(share.id) ?? [],
  };
}

function totals(
  holdings: readonly HoldingNow[],
  cash: CashBalance | undefined,
) {
  const sharesEur = holdings.reduce(
    (sum, { valueEur }) => (valueEur === null ? sum : sum.plus(valueEur)),
    new Big(0),
  );
  const cashEur = new Big(cash?.amountEur ?? 0);
  return { sharesEur, cashEur, balanceEur: sharesEur.plus(cashEur) };
}

/** The balance's gain from the period's start to now, measured as the series' points are. */
function gainNow(
  window: RaceWindow,
  userId: string,
  now: (Balance & { at: Date }) | undefined,
): Gain {
  const points = windowPoints(window, userId, { closesOnly: false });
  const last = withGains(now === undefined ? points : [...points, now]).at(-1);
  return toGain(last?.gain ?? { eur: new Big(0), base: new Big(0) });
}

/**
 * `GET /users/{userId}/portfolio?period=`: the member's holdings and cash now,
 * and the balance's gain since the period's start.
 */
export async function readPortfolio(
  context: ReadServices,
  input: { userId: string; period: Period },
): Promise<Portfolio> {
  const { db, raceTimeZone: timeZone } = context;
  const { userId } = input;
  await findPortfolioOwner(db, userId);
  const at = new Date();
  const [window, positions, cash, changes, balances] = await Promise.all([
    raceWindow(context, input.period),
    currentPositions.listByUser(db, userId),
    cashBalances.latestAt(db, userId, at),
    shareValues.changesAtDayValue(db, { userId }, timeZone),
    valuation.balancesAt(db, { at, timeZone }),
  ]);
  const ids = positions.map(({ shareId }) => shareId);
  const [holdings, starts, firsts, series] = await Promise.all([
    holdingsNow(db, positions),
    shareValues.valuesAt(db, ids, { at: window.startAt }),
    shareValues.earliestValues(db, ids),
    chartPoints(context, ids, {
      window,
      period: input.period,
      intraday: "since last close",
    }),
  ]);
  const { sharesEur, cashEur, balanceEur } = totals(holdings, cash);
  const now = balances.get(userId);
  const latest = holdings.flatMap(({ value }) => value?.at.getTime() ?? []);
  const holdingContext = {
    window,
    balance: balanceEur,
    changes: groupChanges(changes, ({ shareId }) => shareId),
    starts,
    firsts,
    series,
    timeZone,
  };
  return {
    latestPricesAt:
      latest.length === 0 ? null : new Date(Math.max(...latest)).toISOString(),
    balanceEur: money(balanceEur),
    sharesEur: money(sharesEur),
    sharesWeight: ratio(sharesEur, balanceEur),
    cashEur: money(cashEur),
    cashWeight: ratio(cashEur, balanceEur),
    cashSetAt: cash?.effectiveAt.toISOString() ?? null,
    gain: gainNow(window, userId, now && { ...now, at }),
    firstEntryOn: window.firstEntries.get(userId)?.day ?? null,
    measuredFrom: measuredFrom(window, userId),
    incomplete: holdings.some(({ valueEur }) => valueEur === null),
    holdings: holdings.map((holding) => toHolding(holding, holdingContext)),
  };
}
