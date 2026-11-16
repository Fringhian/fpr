import type { Id } from "@fpr/contracts";
import { fixturePersonId } from "../fixtures/people.ts";
import { manualValues, marketPrices } from "../fixtures/prices.ts";
import type { FixtureShare } from "../fixtures/shares.ts";
import type { Calendar } from "./calendar.ts";
import type { StoredEntry, StoredShare } from "./types.ts";

/**
 * When a share was stored: a few minutes before its first change, as a
 * lookup comes before the change, or with its first value; a month ago for
 * one nobody recorded.
 */
function addedAtMs(
  shareId: Id,
  entries: readonly StoredEntry[],
  events: readonly { madeAtMs: number }[],
  calendar: Calendar,
): number {
  const moments = [
    ...entries.flatMap((entry) =>
      entry.type === "change" && entry.shareId === shareId
        ? entry.atMs - 5 * 60_000
        : [],
    ),
    ...events.map((event) => event.madeAtMs),
  ];
  return moments.length === 0
    ? calendar.nowMs - 30 * 24 * 60 * 60 * 1000
    : Math.min(...moments);
}

/** A fixture share as stored, with its invented prices or value points. */
export function storedShare(
  fixture: FixtureShare,
  calendar: Calendar,
  index: number,
  entries: readonly StoredEntry[],
): StoredShare {
  const values =
    fixture.values === undefined
      ? { prices: [], events: [] }
      : manualValues(
          fixture.values,
          calendar,
          fixturePersonId,
          1000 + index * 100,
        );
  return {
    id: fixture.id,
    isin: fixture.isin,
    name: fixture.name,
    kind: fixture.values === undefined ? "market" : "manual",
    symbol: fixture.symbol,
    exchange: fixture.exchange,
    tradingCurrency: fixture.tradingCurrency,
    addedAtMs: addedAtMs(fixture.id, entries, values.events, calendar),
    prices:
      fixture.market === null
        ? values.prices
        : marketPrices(fixture.market, calendar, index + 1),
    valueEvents: values.events,
  };
}
