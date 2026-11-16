import type { Listing, LookupResult } from "@fpr/contracts";
import { marketPrices } from "../../fixtures/prices.ts";
import { providerCatalogue } from "../../fixtures/provider-catalogue.ts";
import type { FixtureShare } from "../../fixtures/shares.ts";
import { lookupErrors } from "../../magic.ts";
import { mockError } from "../../server/errors.ts";
import { mock, viewerOf } from "../../server/implementer.ts";
import { requireShare, toShareSummary } from "../../store/shares.ts";
import type { MockStore, StoredShare } from "../../store/types.ts";

/** How a share the provider finds moves, once stored. */
const lookedUpModel = {
  firstPriceEur: 48,
  drift: 0.0003,
  volatility: 0.01,
  historyDays: 440,
};

function refuseTakenIsin(
  store: MockStore,
  isin: string,
  except?: string,
): void {
  const holder = store.shares.find(
    (share) => share.isin === isin && share.id !== except,
  );
  if (holder !== undefined) {
    throw mockError("isin_taken", { shareId: holder.id });
  }
}

/** Stores a listing the provider returned, with its invented prices. */
function storeListing(
  store: MockStore,
  listing: Pick<
    FixtureShare,
    "isin" | "name" | "symbol" | "exchange" | "tradingCurrency" | "market"
  >,
): StoredShare {
  const share: StoredShare = {
    id: crypto.randomUUID(),
    isin: listing.isin,
    name: listing.name,
    kind: "market",
    symbol: listing.symbol,
    exchange: listing.exchange,
    tradingCurrency: listing.tradingCurrency,
    prices: marketPrices(
      listing.market ?? lookedUpModel,
      store.calendar,
      store.shares.length + 1,
    ),
    valueEvents: [],
  };
  store.shares.push(share);
  return share;
}

function matching(query: string, ...fields: (string | null)[]): boolean {
  const needle = query.toLowerCase();
  return fields.some((field) => field?.toLowerCase().includes(needle));
}

/** A lookup at the provider: the matching shares, stored, and the listings without an ISIN. */
function lookUp(store: MockStore, query: string): LookupResult {
  for (const listing of providerCatalogue.withIsin) {
    if (
      matching(query, listing.name, listing.isin, listing.symbol) &&
      !store.shares.some((share) => share.isin === listing.isin)
    ) {
      storeListing(store, listing);
    }
  }
  return {
    shares: store.shares
      .filter(
        (share) =>
          share.kind === "market" &&
          matching(query, share.name, share.isin, share.symbol),
      )
      .map(toShareSummary),
    listings: providerCatalogue.withoutIsin.filter(
      (listing: Listing) =>
        matching(query, listing.name, listing.symbol) &&
        !store.shares.some((share) => share.symbol === listing.symbol),
    ),
  };
}

/** Lookups, manual shares, and deleting a share. */
export const manualShareWrites = {
  lookup: mock.shares.lookup.handler(({ context, input }) => {
    const { store } = context;
    const error = lookupErrors[input.query as keyof typeof lookupErrors];
    if (error !== undefined) {
      throw mockError(error);
    }
    if (input.isin === undefined) {
      return lookUp(store, input.query);
    }
    const listing = providerCatalogue.withoutIsin.find(
      (candidate) => candidate.symbol === input.query,
    );
    if (listing === undefined) {
      throw mockError("not_found");
    }
    refuseTakenIsin(store, input.isin);
    const share = storeListing(store, {
      ...listing,
      isin: input.isin,
      market: null,
    });
    return { shares: [toShareSummary(share)], listings: [] };
  }),

  createManual: mock.shares.createManual.handler(({ context, input }) => {
    const { store } = context;
    const viewer = viewerOf(context);
    refuseTakenIsin(store, input.isin);
    const atMs = Date.parse(input.at);
    if (atMs > store.calendar.nowMs) {
      throw mockError("future_moment");
    }
    const share: StoredShare = {
      id: crypto.randomUUID(),
      isin: input.isin,
      name: input.name,
      kind: "manual",
      symbol: null,
      exchange: null,
      tradingCurrency: null,
      prices: [
        {
          atMs,
          priceEur: input.priceEur,
          source: "manual",
          enteredBy: viewer.id,
        },
      ],
      valueEvents: [
        {
          id: crypto.randomUUID(),
          atMs,
          madeBy: viewer.id,
          madeAtMs: store.calendar.nowMs,
          priceEur: input.priceEur,
          previousPriceEur: null,
        },
      ],
    };
    store.shares.push(share);
    return toShareSummary(share);
  }),

  update: mock.shares.update.handler(({ context, input }) => {
    const { store } = context;
    const share = requireShare(store, input.id, () => mockError("not_found"));
    if (share.kind !== "manual") {
      throw mockError("forbidden");
    }
    if (input.isin !== undefined) {
      refuseTakenIsin(store, input.isin, share.id);
    }
    share.name = input.name ?? share.name;
    share.isin = input.isin ?? share.isin;
    return toShareSummary(share);
  }),

  delete: mock.shares.delete.handler(({ context, input }) => {
    const { store } = context;
    const share = requireShare(store, input.id, () => mockError("not_found"));
    if (
      store.entries.some(
        (entry) => entry.type === "change" && entry.shareId === share.id,
      )
    ) {
      throw mockError("share_in_use");
    }
    store.shares = store.shares.filter((candidate) => candidate !== share);
  }),
};
