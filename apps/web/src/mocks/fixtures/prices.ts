import type { Id } from "@fpr/contracts";
import { localInstant } from "../../lib/race-day.ts";
import {
  addDays,
  type Calendar,
  closeAt,
  refreshInstants,
  tradingDays,
} from "../store/calendar.ts";
import type { StoredPrice, StoredValueEvent } from "../store/types.ts";
import { fixtureId, normal, seededRandom } from "./random.ts";
import type { ManualValue, MarketModel } from "./shares.ts";

/** Trading days before the last close that also carry their refreshes. */
const INTRADAY_DAYS = 6;

function euros(value: number): string {
  return Math.max(value, 0.01).toFixed(2);
}

/** A day's refreshes, wandering from the previous close to the day's close. */
function dayRefreshes(
  day: string,
  from: number,
  to: number,
  model: MarketModel,
  random: () => number,
): StoredPrice[] {
  const instants = refreshInstants(day);
  return instants.map((atMs, step) => {
    const share = (step + 1) / (instants.length + 1);
    const wander =
      from *
      model.volatility *
      0.4 *
      normal(random) *
      Math.sqrt(share * (1 - share));
    return {
      atMs,
      priceEur: euros(from + (to - from) * share + wander),
      source: "intraday",
    };
  });
}

/** Today's refreshes so far, from the last close: provisional. */
function todayRefreshes(
  calendar: Calendar,
  lastClose: number,
  model: MarketModel,
  random: () => number,
): StoredPrice[] {
  let price = lastClose;
  return calendar.provisional.map((atMs) => {
    price *= Math.exp((model.volatility / 4) * normal(random));
    return { atMs, priceEur: euros(price), source: "intraday" };
  });
}

/**
 * A market share's invented prices, oldest first: a close each trading day
 * of its history the daily run has stored, the refreshes of the last days,
 * and today's. A stale share's closes stop `staleDays` before the last close,
 * with no refreshes since.
 */
export function marketPrices(
  model: MarketModel,
  calendar: Calendar,
  seed: number,
): StoredPrice[] {
  const random = seededRandom(seed);
  const history = tradingDays(
    addDays(calendar.today, -model.historyDays),
    calendar.lastCloseOn,
  );
  const days =
    model.staleDays === undefined
      ? history
      : history.slice(0, -model.staleDays);
  const prices: StoredPrice[] = [];
  let close = model.firstPriceEur;
  days.forEach((day, index) => {
    const previous = close;
    if (index > 0) {
      close =
        previous * Math.exp(model.drift + model.volatility * normal(random));
    }
    if (index > 0 && index >= days.length - INTRADAY_DAYS) {
      prices.push(...dayRefreshes(day, previous, close, model, random));
    }
    if (day <= calendar.closesThrough) {
      prices.push({
        atMs: closeAt(day),
        priceEur: euros(close),
        source: "close",
      });
    }
  });
  return model.staleDays === undefined
    ? [...prices, ...todayRefreshes(calendar, close, model, random)]
    : prices;
}

/**
 * A manual share's value points, at noon of their day, and the edits that
 * made them: each added an hour later, and edited three days on.
 */
export function manualValues(
  values: readonly ManualValue[],
  calendar: Calendar,
  personId: (key: ManualValue["by"]) => Id,
  firstEventNumber: number,
): { prices: StoredPrice[]; events: StoredValueEvent[] } {
  const hour = 60 * 60 * 1000;
  const prices: StoredPrice[] = [];
  const events: StoredValueEvent[] = [];
  for (const value of values) {
    const atMs = localInstant(
      addDays(calendar.today, -value.daysAgo),
      "12:00:00",
    );
    const by = personId(value.by);
    prices.push({
      atMs,
      priceEur: value.priceEur,
      source: "manual",
      enteredBy: by,
    });
    events.push({
      id: fixtureId(firstEventNumber + events.length),
      atMs,
      madeBy: by,
      madeAtMs: atMs + hour,
      priceEur: value.editedFrom ?? value.priceEur,
      previousPriceEur: null,
    });
    if (value.editedFrom !== undefined) {
      events.push({
        id: fixtureId(firstEventNumber + events.length),
        atMs,
        madeBy: by,
        madeAtMs: atMs + 72 * hour,
        priceEur: value.priceEur,
        previousPriceEur: value.editedFrom,
      });
    }
  }
  return { prices, events };
}
