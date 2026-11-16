import type {
  Id,
  Members,
  Period,
  Race,
  ShareLeaderboard,
} from "@fpr/contracts";
import { dayOf, timestamp } from "./calendar.ts";
import { Big, money, ratio } from "./decimal.ts";
import { type GainAmount, gainPercent, toGain } from "./gain.ts";
import { racers, toPerson } from "./people.ts";
import {
  firstEntryMs,
  measuredFrom,
  raceWindow,
  toSeriesPoints,
  windowPoints,
} from "./series.ts";
import { earliestPrice, priceChange, toShareSummary } from "./shares.ts";
import { type BestHolding, standingsAt } from "./standings.ts";
import type { MockStore } from "./types.ts";
import { changesOf, holdingsNow, quantitiesAt } from "./valuation.ts";

export function toBestHolding(best: BestHolding | null) {
  return best === null
    ? null
    : { share: toShareSummary(best.share), gain: toGain(best.gain) };
}

/** Highest first, a percentage of `null` last. */
export function compareGains(unit: "eur" | "percent") {
  return (a: GainAmount, b: GainAmount): number => {
    if (unit === "eur") {
      return b.eur.cmp(a.eur);
    }
    const [pa, pb] = [gainPercent(a), gainPercent(b)];
    return pa === null || pb === null
      ? Number(pa === null) - Number(pb === null)
      : pb.cmp(pa);
  };
}

/** A member's three largest priced holdings now, each in percent of their balance now. */
function topHoldings(store: MockStore, userId: Id) {
  const { holdings, balanceEur } = holdingsNow(store, userId);
  return {
    holdingCount: holdings.length,
    topHoldings: holdings
      .flatMap(({ share, valueEur }) =>
        valueEur === null
          ? []
          : [
              {
                share: toShareSummary(share),
                weight: ratio(valueEur, balanceEur) ?? "0.00",
              },
            ],
      )
      .slice(0, 3),
  };
}

/**
 * Every member with their closes over the period and their gain and balance
 * at the last close, and their largest holdings now. A member with no close
 * yet has no gain, balance, or series. As the API lists them: those with a
 * close, then those not started, each in the order they were added.
 */
export function membersView(store: MockStore, period: Period): Members {
  const { window, standings, notStarted } = standingsAt(store, period);
  const rows = [
    ...standings.map((standing) => ({ person: standing.person, standing })),
    ...notStarted.map((person) => ({ person, standing: undefined })),
  ];
  return {
    members: rows.map(({ person, standing }) => {
      const first = firstEntryMs(store, person.id);
      return {
        member: toPerson(person),
        firstEntryOn: first === null ? null : dayOf(first),
        measuredFrom: measuredFrom(store, person.id, window),
        incomplete: standing?.end.incomplete ?? false,
        gain: standing === undefined ? null : toGain(standing.gain),
        balanceEur:
          standing === undefined ? null : money(standing.end.balanceEur),
        series: standing === undefined ? [] : toSeriesPoints(standing.closes),
        ...topHoldings(store, person.id),
      };
    }),
  };
}

/**
 * Each member's balance and gain since the period's start at each close,
 * then at each refresh since the last close, which is provisional. A member
 * with no point yet hasn't started.
 */
export function raceView(store: MockStore, period: Period): Race {
  const window = raceWindow(store, period);
  const latest = Math.max(
    0,
    ...store.shares.flatMap((share) =>
      share.prices
        .filter((price) => price.atMs <= store.calendar.nowMs)
        .map((price) => price.atMs),
    ),
  );
  const lanes = racers(store).map((person) => ({
    person,
    points: windowPoints(store, person.id, window, { closesOnly: false }),
  }));
  return {
    lastCloseOn: store.calendar.lastCloseOn,
    latestPricesAt: latest === 0 ? null : timestamp(latest),
    refreshesRunning: store.calendar.refreshesRunning,
    members: lanes.flatMap(({ person, points }) =>
      points.length === 0
        ? []
        : [
            {
              member: toPerson(person),
              measuredFrom: measuredFrom(store, person.id, window),
              incomplete: points.at(-1)?.incomplete ?? false,
              points: toSeriesPoints(points),
            },
          ],
    ),
    notStarted: lanes
      .filter(({ points }) => points.length === 0)
      .map(({ person }) => toPerson(person)),
  };
}

/**
 * The shares someone held at the last close, by their change in percent from
 * the period's start to it, or for `all` from their first price. A share
 * without a price at both ends is left out.
 */
export function shareLeaderboardView(
  store: MockStore,
  period: Period,
): ShareLeaderboard {
  const window = raceWindow(store, period);
  const held = new Set(
    store.people.flatMap((person) => [
      ...quantitiesAt(changesOf(store, person.id), window.lastCloseMs).keys(),
    ]),
  );
  const rows = store.shares.flatMap((share) => {
    const startMs =
      period === "all" ? earliestPrice(share)?.atMs : window.startMs;
    const change =
      held.has(share.id) && startMs !== undefined
        ? priceChange(share, startMs, window.lastCloseMs)
        : null;
    return change === null ? [] : [{ share: toShareSummary(share), change }];
  });
  const percent = (row: (typeof rows)[number]) => new Big(row.change.percent);
  rows.sort(
    (a, b) =>
      percent(b).cmp(percent(a)) || a.share.name.localeCompare(b.share.name),
  );
  return { lastCloseOn: store.calendar.lastCloseOn, rows };
}
