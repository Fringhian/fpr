import type { Listing } from "@fpr/contracts";
import { type Db, type Share, shares } from "@fpr/db";
import { service } from "../orpc.js";
import type { Pricing } from "../pricing/pricing.js";
import type { PriceProvider, ProviderListing } from "../providers/index.js";
import { providerRefusal } from "./provider-refusal.js";
import { toShareSummary } from "./shares.js";

/**
 * One provider call, when the calls left after it still cover the
 * schedule's. Rejects with the route's refusal otherwise, or when it fails.
 */
async function askProvider<T>(
  pricing: Pricing,
  errors: { call_budget_used(): Error; provider_unavailable(): Error },
  call: (provider: PriceProvider) => Promise<T>,
): Promise<T> {
  if (!pricing.deps.budget.allowsLookup(1)) {
    throw errors.call_budget_used();
  }
  try {
    return await call(pricing.deps.provider);
  } catch (error) {
    throw providerRefusal(error, errors);
  }
}

/**
 * One listing per ISIN: the primary one, otherwise the one in the ISIN's
 * country, otherwise the first returned. Listings without an ISIN are kept
 * apart, for the member to complete.
 */
function pickListings(listings: readonly ProviderListing[]): {
  withIsin: (ProviderListing & { isin: string })[];
  withoutIsin: ProviderListing[];
} {
  const byIsin = new Map<string, (ProviderListing & { isin: string })[]>();
  const withoutIsin: ProviderListing[] = [];
  for (const listing of listings) {
    const { isin } = listing;
    if (isin === null) {
      withoutIsin.push(listing);
    } else {
      byIsin.set(isin, [...(byIsin.get(isin) ?? []), { ...listing, isin }]);
    }
  }
  const withIsin = [...byIsin].flatMap(([isin, group]) => {
    const pick =
      group.find(({ primary }) => primary === true) ??
      group.find(({ countryCode }) => countryCode === isin.slice(0, 2)) ??
      group[0];
    return pick === undefined ? [] : [pick];
  });
  return { withIsin, withoutIsin };
}

/** Stores a listing as a market share under `isin`, or `undefined` when another share has it. */
function insertMarket(
  db: Db,
  listing: ProviderListing,
  isin: string,
): Promise<Share | undefined> {
  return shares.insertUnlessIsinTaken(db, {
    isin,
    name: listing.name,
    kind: "market",
    tradingCurrency: listing.tradingCurrency,
    providerSymbol: listing.symbol,
    exchange: listing.exchange,
    historyStartsOn: null,
    createdBy: null,
  });
}

/** The share that has the listing's ISIN, storing the listing when none does. */
async function storeListing(
  db: Db,
  listing: ProviderListing & { isin: string },
): Promise<Share> {
  const stored =
    (await shares.findByIsin(db, listing.isin)) ??
    (await insertMarket(db, listing, listing.isin)) ??
    (await shares.findByIsin(db, listing.isin));
  if (stored === undefined) {
    throw new Error(`No share holds ${listing.isin} after storing it`);
  }
  return stored;
}

function toListing(listing: ProviderListing): Listing {
  const { symbol, name, exchange, tradingCurrency } = listing;
  return { symbol, name, exchange, tradingCurrency };
}

/**
 * `POST /lookup`: one provider call. Each listing with an ISIN is stored
 * without history, unless a share already has its ISIN. A listing without
 * one is returned for the member to complete, or as its share once stored.
 */
export const lookup = service.lookup.handler(
  async ({ input, context, errors }) => {
    const { db, pricing } = context;
    const listings = await askProvider(pricing, errors, (provider) =>
      provider.lookup(input.query),
    );
    const { withIsin, withoutIsin } = pickListings(listings);
    const found: Share[] = [];
    for (const listing of withIsin) {
      found.push(await storeListing(db, listing));
    }
    const known = await shares.listBySymbols(
      db,
      withoutIsin.map(({ symbol }) => symbol),
    );
    const knownSymbols = new Set(known.map((share) => share.providerSymbol));
    const unique = new Map(
      [...found, ...known].map((share) => [share.id, share]),
    );
    return {
      shares: [...unique.values()].map(toShareSummary),
      listings: withoutIsin
        .filter(({ symbol }) => !knownSymbols.has(symbol))
        .map(toListing),
    };
  },
);

/**
 * `POST /shares/market`: stores a listing a lookup returned without an ISIN,
 * under the ISIN the member typed, looking the symbol up again.
 */
export const createMarket = service.createMarket.handler(
  async ({ input, context, errors }) => {
    const { db, pricing } = context;
    const isinTaken = async () => {
      const holder = await shares.findByIsin(db, input.isin);
      return holder && errors.isin_taken({ data: { shareId: holder.id } });
    };
    const taken = await isinTaken();
    if (taken !== undefined) {
      throw taken;
    }
    const listing = await askProvider(pricing, errors, (provider) =>
      provider.listing(input.symbol),
    );
    if (listing === undefined) {
      throw errors.not_found();
    }
    const share = await insertMarket(db, listing, input.isin);
    if (share === undefined) {
      throw (await isinTaken()) ?? new Error(`${input.isin} taken, then freed`);
    }
    return toShareSummary(share);
  },
);
