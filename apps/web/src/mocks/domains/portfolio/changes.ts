import type { Id } from "@fpr/contracts";
import { mockError } from "../../server/errors.ts";
import { mock, viewerOf } from "../../server/implementer.ts";
import { plain, zero } from "../../store/decimal.ts";
import { toChange } from "../../store/portfolio.ts";
import { requireShare } from "../../store/shares.ts";
import type { MockStore, StoredChange } from "../../store/types.ts";
import {
  notInFuture,
  storedWithId,
  writableEntry,
  writablePortfolio,
} from "./owner.ts";

/**
 * Refuses a write that takes a holding below zero at any moment, naming the
 * stored change it would break, or `null` for the change sent, and what was
 * held just before it.
 */
function keepHoldingsAboveZero(
  store: MockStore,
  { userId, shareId }: { userId: Id; shareId: Id },
  changes: readonly StoredChange[],
  sent: StoredChange | null,
): void {
  let held = zero;
  const ordered = changes
    .filter((change) => change.userId === userId && change.shareId === shareId)
    .sort((a, b) => a.atMs - b.atMs);
  for (const change of ordered) {
    const next = held.plus(change.quantityDelta);
    if (next.lt(0)) {
      throw mockError("holding_below_zero", {
        change: change === sent ? null : toChange(store, change),
        held: plain(held),
      });
    }
    held = next;
  }
}

function storedChanges(store: MockStore): StoredChange[] {
  return store.entries.filter(
    (entry): entry is StoredChange => entry.type === "change",
  );
}

/** Adding, editing and deleting share changes. */
export const changeWrites = {
  addChange: mock.portfolio.addChange.handler(({ context, input }) => {
    const { store } = context;
    writablePortfolio(store, viewerOf(context), input.userId);
    const stored = storedWithId(store, input.userId, input.id);
    if (stored?.type === "change") {
      return toChange(store, stored);
    }
    requireShare(store, input.shareId, () => mockError("not_found"));
    notInFuture(store, input.effectiveAt);
    const atMs = Date.parse(input.effectiveAt);
    const change: StoredChange = {
      type: "change",
      id: input.id ?? crypto.randomUUID(),
      userId: input.userId,
      shareId: input.shareId,
      quantityDelta: input.quantityDelta,
      effectiveAt: new Date(atMs).toISOString(),
      atMs,
    };
    keepHoldingsAboveZero(
      store,
      change,
      [...storedChanges(store), change],
      change,
    );
    store.entries.push(change);
    return toChange(store, change);
  }),

  updateChange: mock.portfolio.updateChange.handler(({ context, input }) => {
    const { store } = context;
    const change = writableEntry(store, viewerOf(context), input.id, "change");
    notInFuture(store, input.effectiveAt);
    const atMs =
      input.effectiveAt === undefined
        ? change.atMs
        : Date.parse(input.effectiveAt);
    const edited: StoredChange = {
      ...change,
      quantityDelta: input.quantityDelta ?? change.quantityDelta,
      effectiveAt: new Date(atMs).toISOString(),
      atMs,
    };
    const others = storedChanges(store).filter(
      (candidate) => candidate !== change,
    );
    keepHoldingsAboveZero(store, change, [...others, edited], edited);
    Object.assign(change, edited);
    return toChange(store, change);
  }),

  deleteChange: mock.portfolio.deleteChange.handler(({ context, input }) => {
    const { store } = context;
    const change = writableEntry(store, viewerOf(context), input.id, "change");
    const others = storedChanges(store).filter(
      (candidate) => candidate !== change,
    );
    keepHoldingsAboveZero(store, change, others, null);
    store.entries = store.entries.filter((entry) => entry !== change);
  }),
};
