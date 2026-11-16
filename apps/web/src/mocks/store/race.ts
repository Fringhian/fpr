import type {
  Id,
  Members,
  Period,
  Race,
  ShareLeaderboard,
} from "@fpr/contracts";
import { timestamp } from "./calendar.ts";
import { Big, money, ratio } from "./decimal.ts";
import { type GainAmount, gainBetween, gainPercent, toGain } from "./gain.ts";
import { firstEntryOn, racers, toPerson } from "./people.ts";
import {
  earliestEntry,
  measuredFrom,
  type PeriodWindow,
  periodWindow,
  seriesPoints,
  windowInstants,
} from "./series.ts";
import { priceChange, toShareSummary } from "./shares.ts";
import type { MockPerson, MockStore } from "./types.ts";
import { changesOf, valuationAt } from "./valuation.ts";

/** The race's members and its window: those with an entry, and those not started. */
export function raceField(store: MockStore, period: Period) {
  const people = racers(store);
  const started = people.filter(
    (person) => firstEntryOn(store, person.id) !== null,
  );
  const window = periodWindow(
    store,
    period,
    earliestEntry(
      store,
      started.map((person) => person.id),
    ),
  );
  return {
    window,
    started,
    notStarted: people
      .filter((person) => !started.includes(person))
      .map(toPerson),
  };
}

/** A member's result as of the last close. */
export function standing(
  store: MockStore,
  person: MockPerson,
  window: PeriodWindow,
) {
  const end = window.lastCloseMs;
  const changes = changesOf(store, person.id);
  const valuation = valuationAt(store, person.id, end);
  const shareGains = valuation.holdings.flatMap((holding) =>
    holding.valueEur === null
      ? []
      : [
          {
            holding,
            gain: gainBetween(
              store,
              changes,
              window.startMs,
              end,
              holding.share.id,
            ),
          },
        ],
  );
  return {
    valuation,
    gain: gainBetween(store, changes, window.startMs, end),
    shareGains,
  };
}

/** The holding with the largest gain in percent, or `null`. */
export function bestHolding(
  shareGains: ReturnType<typeof standing>["shareGains"],
) {
  const ranked = shareGains
    .map(({ holding, gain }) => ({ holding, gain, percent: gainPercent(gain) }))
    .filter(
      (entry): entry is typeof entry & { percent: Big } =>
        entry.percent !== null,
    )
    .sort((a, b) => b.percent.cmp(a.percent));
  const best = ranked[0];
  return best === undefined
    ? null
    : { share: toShareSummary(best.holding.share), gain: toGain(best.gain) };
}

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

export function membersView(store: MockStore, period: Period): Members {
  const { window, started } = raceField(store, period);
  const people = racers(store);
  return {
    members: people.map((person) => {
      const hasEntries = started.includes(person);
      const { valuation, gain } = standing(store, person, window);
      const ranked = valuation.holdings
        .filter((holding) => holding.valueEur !== null)
        .sort((a, b) =>
          (b.valueEur ?? new Big(0)).cmp(a.valueEur ?? new Big(0)),
        );
      return {
        member: toPerson(person),
        firstEntryOn: firstEntryOn(store, person.id),
        measuredFrom: measuredFrom(store, person.id, window),
        incomplete: valuation.incomplete,
        gain: hasEntries ? toGain(gain) : null,
        balanceEur: hasEntries ? money(valuation.balanceEur) : null,
        series: seriesPoints(store, person.id, window, [
          window.startMs,
          ...window.closes,
        ]),
        topHoldings: ranked.slice(0, 3).map((holding) => ({
          share: toShareSummary(holding.share),
          weight:
            ratio(holding.valueEur ?? new Big(0), valuation.balanceEur) ?? "0",
        })),
        holdingCount: valuation.holdings.length,
      };
    }),
  };
}

export function raceView(store: MockStore, period: Period): Race {
  const { window, started, notStarted } = raceField(store, period);
  const latest = Math.max(
    0,
    ...store.shares.flatMap((share) =>
      share.prices
        .filter((price) => price.atMs <= store.calendar.nowMs)
        .map((price) => price.atMs),
    ),
  );
  return {
    lastCloseOn: store.calendar.lastCloseOn,
    latestPricesAt: latest === 0 ? null : timestamp(latest),
    refreshesRunning: store.calendar.refreshesRunning,
    members: started.map((person) => {
      const points = seriesPoints(
        store,
        person.id,
        window,
        windowInstants(store, window),
      );
      return {
        member: toPerson(person),
        measuredFrom: measuredFrom(store, person.id, window),
        incomplete: points.at(-1)?.incomplete ?? false,
        points,
      };
    }),
    notStarted,
  };
}

export function shareLeaderboardView(
  store: MockStore,
  period: Period,
): ShareLeaderboard {
  const { window, started } = raceField(store, period);
  const held = new Set<Id>(
    started.flatMap((person) =>
      valuationAt(store, person.id, window.lastCloseMs).holdings.map(
        (holding) => holding.share.id,
      ),
    ),
  );
  const rows = store.shares.flatMap((share) => {
    const change = held.has(share.id)
      ? priceChange(share, window.startMs, window.lastCloseMs)
      : null;
    return change === null ? [] : [{ share: toShareSummary(share), change }];
  });
  rows.sort((a, b) => new Big(b.change.percent).cmp(a.change.percent));
  return { lastCloseOn: store.calendar.lastCloseOn, rows };
}
