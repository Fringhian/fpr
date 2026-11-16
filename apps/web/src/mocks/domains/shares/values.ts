import type { Decimal, ShareValue } from "@fpr/contracts";
import { mockError } from "../../server/errors.ts";
import { mock, viewerOf } from "../../server/implementer.ts";
import { timestamp } from "../../store/calendar.ts";
import { Big } from "../../store/decimal.ts";
import { racers, toPerson } from "../../store/people.ts";
import { requireShare } from "../../store/shares.ts";
import type {
  MockPerson,
  MockStore,
  StoredPrice,
  StoredShare,
} from "../../store/types.ts";

function manualShare(store: MockStore, id: string): StoredShare {
  const share = requireShare(store, id, () => mockError("not_found"));
  if (share.kind !== "manual") {
    throw mockError("forbidden");
  }
  return share;
}

/** The value point at an instant, matched as an instant whatever its offset. */
function valueAt(share: StoredShare, at: string): StoredPrice {
  const atMs = Date.parse(at);
  const value = share.prices.find((price) => price.atMs === atMs);
  if (value === undefined) {
    throw mockError("not_found");
  }
  return value;
}

/**
 * With `?mock-conflict`, another member raises the value by €1 the first
 * time someone edits or deletes it, as if they had saved just before.
 */
function playConflict(
  store: MockStore,
  share: StoredShare,
  value: StoredPrice,
  viewer: MockPerson,
): void {
  if (store.conflicted === null || store.conflicted.has(value.atMs)) return;
  store.conflicted.add(value.atMs);
  const other = racers(store).find((person) => person.id !== viewer.id);
  if (other === undefined) return;
  const priceEur = new Big(value.priceEur).plus(1).toFixed(2);
  recordEdit(store, share, other, {
    atMs: value.atMs,
    priceEur,
    previousPriceEur: value.priceEur,
  });
  value.priceEur = priceEur;
  value.enteredBy = other.id;
}

/** Refuses an edit made over a value someone changed in the meantime. */
function expectPrice(value: StoredPrice, expected: Decimal): void {
  if (!new Big(value.priceEur).eq(expected)) {
    throw mockError("value_changed", { priceEur: value.priceEur });
  }
}

function recordEdit(
  store: MockStore,
  share: StoredShare,
  viewer: MockPerson,
  edit: {
    atMs: number;
    priceEur: Decimal | null;
    previousPriceEur: Decimal | null;
  },
): void {
  share.valueEvents.push({
    id: crypto.randomUUID(),
    madeBy: viewer.id,
    madeAtMs: store.calendar.nowMs,
    ...edit,
  });
}

function toShareValue(value: StoredPrice, viewer: MockPerson): ShareValue {
  return {
    at: timestamp(value.atMs),
    priceEur: value.priceEur,
    enteredBy: toPerson(viewer),
  };
}

/** Adding, editing and deleting a manual share's value points. */
export const valueWrites = {
  addValue: mock.shares.addValue.handler(({ context, input }) => {
    const { store } = context;
    const viewer = viewerOf(context);
    const share = manualShare(store, input.id);
    const atMs = Date.parse(input.at);
    if (atMs > store.calendar.nowMs) {
      throw mockError("future_moment");
    }
    const existing = share.prices.find((price) => price.atMs === atMs);
    if (existing !== undefined) {
      throw mockError("value_changed", { priceEur: existing.priceEur });
    }
    const value: StoredPrice = {
      atMs,
      priceEur: input.priceEur,
      source: "manual",
      enteredBy: viewer.id,
    };
    share.prices = [...share.prices, value].sort((a, b) => a.atMs - b.atMs);
    recordEdit(store, share, viewer, {
      atMs,
      priceEur: input.priceEur,
      previousPriceEur: null,
    });
    return toShareValue(value, viewer);
  }),

  updateValue: mock.shares.updateValue.handler(({ context, input }) => {
    const { store } = context;
    const viewer = viewerOf(context);
    const share = manualShare(store, input.id);
    const value = valueAt(share, input.at);
    playConflict(store, share, value, viewer);
    expectPrice(value, input.expectedPriceEur);
    recordEdit(store, share, viewer, {
      atMs: value.atMs,
      priceEur: input.priceEur,
      previousPriceEur: value.priceEur,
    });
    value.priceEur = input.priceEur;
    value.enteredBy = viewer.id;
    return toShareValue(value, viewer);
  }),

  deleteValue: mock.shares.deleteValue.handler(({ context, input }) => {
    const { store } = context;
    const viewer = viewerOf(context);
    const share = manualShare(store, input.id);
    const value = valueAt(share, input.at);
    if (share.prices.length === 1) {
      throw mockError("last_value_point");
    }
    playConflict(store, share, value, viewer);
    expectPrice(value, input.expectedPriceEur);
    share.prices = share.prices.filter((price) => price !== value);
    recordEdit(store, share, viewer, {
      atMs: value.atMs,
      priceEur: null,
      previousPriceEur: value.priceEur,
    });
  }),
};
