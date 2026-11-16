import { mock, viewerOf } from "../../server/implementer.ts";
import { toCash } from "../../store/portfolio.ts";
import type { StoredCash } from "../../store/types.ts";
import {
  notInFuture,
  storedWithId,
  writableEntry,
  writablePortfolio,
} from "./owner.ts";

/** Setting, editing and deleting cash balances. */
export const cashWrites = {
  setCash: mock.portfolio.setCash.handler(({ context, input }) => {
    const { store } = context;
    writablePortfolio(store, viewerOf(context), input.userId);
    const stored = storedWithId(store, input.userId, input.id);
    if (stored?.type === "cash") {
      return toCash(stored);
    }
    notInFuture(store, input.effectiveAt);
    const atMs = Date.parse(input.effectiveAt);
    const cash: StoredCash = {
      type: "cash",
      id: input.id ?? crypto.randomUUID(),
      userId: input.userId,
      amountEur: input.amountEur,
      effectiveAt: new Date(atMs).toISOString(),
      atMs,
    };
    store.entries.push(cash);
    return toCash(cash);
  }),

  updateCash: mock.portfolio.updateCash.handler(({ context, input }) => {
    const { store } = context;
    const cash = writableEntry(store, viewerOf(context), input.id, "cash");
    notInFuture(store, input.effectiveAt);
    const atMs =
      input.effectiveAt === undefined
        ? cash.atMs
        : Date.parse(input.effectiveAt);
    Object.assign(cash, {
      amountEur: input.amountEur ?? cash.amountEur,
      effectiveAt: new Date(atMs).toISOString(),
      atMs,
    });
    return toCash(cash);
  }),

  deleteCash: mock.portfolio.deleteCash.handler(({ context, input }) => {
    const { store } = context;
    const cash = writableEntry(store, viewerOf(context), input.id, "cash");
    store.entries = store.entries.filter((entry) => entry !== cash);
  }),
};
