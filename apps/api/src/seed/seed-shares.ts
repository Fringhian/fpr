import { type Db, manualPriceEvents, shares } from "@fpr/db";
import type { PersonKey } from "./data/people.js";
import {
  type ListingKey,
  listings,
  type ManualShareKey,
  manualShares,
  type SeedValuePoint,
  type ShareKey,
} from "./data/shares.js";
import { DAY_MS, type RaceClock } from "./seed-clock.js";
import { inventCloses } from "./seed-closes.js";
import { type IdOf, idOf } from "./seed-ids.js";

interface SeededShares<Key extends ShareKey> {
  ids: ReadonlyMap<Key, string>;
  prices: number;
}

/**
 * Adds the listings, with invented closes from a week before the race, and
 * the manual shares, with their value points. Returns the shares' ids and how
 * many prices were written.
 */
export async function seedShares(
  trx: Db,
  {
    clock,
    timeZone,
    personId,
  }: { clock: RaceClock; timeZone: string; personId: IdOf<PersonKey> },
): Promise<{ shareId: IdOf<ShareKey>; prices: number }> {
  const listed = await seedListings(trx, clock, timeZone);
  const manual = await seedManualShares(trx, clock, personId);
  return {
    shareId: idOf(
      "share",
      new Map<ShareKey, string>([...listed.ids, ...manual.ids]),
    ),
    prices: listed.prices + manual.prices,
  };
}

async function seedListings(
  trx: Db,
  clock: RaceClock,
  timeZone: string,
): Promise<SeededShares<ListingKey>> {
  const ids = new Map<ListingKey, string>();
  let prices = 0;
  for (const [index, listing] of listings.entries()) {
    const share = await shares.insert(trx, {
      isin: listing.isin,
      name: listing.name,
      kind: "market",
      tradingCurrency: listing.tradingCurrency,
      providerSymbol: listing.providerSymbol,
      exchange: listing.exchange,
      historyStartsOn: null,
      createdBy: null,
      createdAt: clock.at(0, 8),
    });
    ids.set(listing.key, share.id);
    const closes = inventCloses(
      listing,
      index,
      clock.start - 7 * DAY_MS,
      clock.today,
      timeZone,
    );
    await trx
      .insertInto("prices")
      .values(closes.map((close) => ({ ...close, shareId: share.id })))
      .execute();
    prices += closes.length;
  }
  return { ids, prices };
}

async function seedManualShares(
  trx: Db,
  clock: RaceClock,
  personId: IdOf<PersonKey>,
): Promise<SeededShares<ManualShareKey>> {
  const ids = new Map<ManualShareKey, string>();
  let prices = 0;
  for (const manual of manualShares) {
    const share = await shares.insert(trx, {
      isin: manual.isin,
      name: manual.name,
      kind: "manual",
      tradingCurrency: null,
      providerSymbol: null,
      exchange: null,
      historyStartsOn: null,
      createdBy: personId(manual.createdBy),
      createdAt: clock.at(manual.createdDay, 8),
    });
    ids.set(manual.key, share.id);
    for (const point of manual.valuePoints) {
      // Before the day's share changes, so a first purchase has a value.
      await insertValuePoint(trx, share.id, point, {
        at: clock.at(point.day, 9),
        personId,
      });
      prices += 1;
    }
  }
  return { ids, prices };
}

async function insertValuePoint(
  trx: Db,
  shareId: string,
  point: SeedValuePoint,
  { at, personId }: { at: Date; personId: IdOf<PersonKey> },
): Promise<void> {
  const first = point.edited ?? point;
  await manualPriceEvents.insert(trx, {
    shareId,
    at,
    action: "added",
    priceEur: first.priceEur,
    previousPriceEur: null,
    userId: personId(first.enteredBy),
    createdAt: at,
  });
  if (point.edited) {
    await manualPriceEvents.insert(trx, {
      shareId,
      at,
      action: "edited",
      priceEur: point.priceEur,
      previousPriceEur: point.edited.priceEur,
      userId: personId(point.enteredBy),
      createdAt: new Date(at.getTime() + DAY_MS),
    });
  }
  await trx
    .insertInto("prices")
    .values({
      shareId,
      at,
      priceEur: point.priceEur,
      source: "manual",
      enteredBy: personId(point.enteredBy),
      createdAt: at,
    })
    .execute();
}
