import { createHash, randomBytes } from "node:crypto";
import {
  accessKeys,
  cashBalances,
  type Db,
  manualPriceEvents,
  type NewPrice,
  portfolioChanges,
  type Role,
  shares,
  users,
} from "@fpr/db";
import { hashPassword } from "better-auth/crypto";
import {
  cash,
  changes,
  listings,
  manualShares,
  type PersonKey,
  people,
  RACE_LENGTH_DAYS,
  SEED_PASSWORD,
  type SeedListing,
  type ShareKey,
} from "./seed-data.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Stops when `NODE_ENV` is `production`: the seed is for development only. */
export function refuseProduction(nodeEnv: string | undefined): void {
  if (nodeEnv === "production") {
    throw new Error("The seed does not run when NODE_ENV is production");
  }
}

/**
 * The UTC instant of a wall-clock time on a calendar day in a time zone,
 * such as 23:59:59 on `2026-03-02` in `Europe/Paris`.
 */
export function zonedMoment(
  day: string,
  time: readonly [hours: number, minutes: number, seconds: number],
  timeZone: string,
): Date {
  const [year, month, date] = day.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const wallClock = Date.UTC(year, month - 1, date, ...time);
  const format = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const offset = (instant: number): number => {
    const parts = Object.fromEntries(
      format.formatToParts(instant).map((part) => [part.type, part.value]),
    );
    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    return asUtc - instant;
  };
  const guess = wallClock - offset(wallClock);
  return new Date(wallClock - offset(guess));
}

/** A small seeded generator, so every seed draws the same closes. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `YYYY-MM-DD` of a UTC instant. */
const isoDay = (instant: number): string =>
  new Date(instant).toISOString().slice(0, 10);

/**
 * Invented daily closes of a listing, one per weekday from `fromDay` to the
 * day before `toDay`, each stored at 23:59:59 of its day in `timeZone`.
 */
function invent(
  listing: SeedListing,
  index: number,
  fromDay: number,
  toDay: number,
  timeZone: string,
): Omit<NewPrice, "shareId">[] {
  const random = mulberry32(index + 1);
  let price = listing.firstCloseEur;
  const closes: Omit<NewPrice, "shareId">[] = [];
  for (let day = fromDay; day < toDay; day += DAY_MS) {
    const weekday = new Date(day).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const noise = random() + random() + random() - 1.5;
    price *= Math.exp(listing.drift + listing.volatility * 2 * noise);
    closes.push({
      at: zonedMoment(isoDay(day), [23, 59, 59], timeZone),
      priceEur: price.toFixed(4),
      source: "close",
      enteredBy: null,
    });
  }
  return closes;
}

export interface SeedOptions {
  /** `PUBLIC_URL`: the access links start with it. */
  publicUrl: string;
  /** `RACE_TIMEZONE`: closes are stored at 23:59:59 of their day in it. */
  timeZone: string;
  /** The seed's clock. The race ends the day before. */
  now?: Date;
}

export interface SeededPerson {
  displayName: string;
  email: string;
  role: Role;
  /** Set for the anonymous viewer and for a link waiting for first use. */
  accessLink: string | null;
}

export interface SeedResult {
  /** The password of every password user. */
  password: string;
  people: SeededPerson[];
  counts: {
    people: number;
    shares: number;
    prices: number;
    portfolioChanges: number;
    cashBalances: number;
  };
}

/**
 * Fills an empty database with an invented race, in one transaction: people
 * of every role, each with an access key, widely traded listings with
 * invented closes, manual shares with value points, and share changes and
 * cash balances over about eight months. Throws, writing nothing, when the
 * database already has people.
 */
export async function seedDatabase(
  db: Db,
  { publicUrl, timeZone, now = new Date() }: SeedOptions,
): Promise<SeedResult> {
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const start = today - RACE_LENGTH_DAYS * DAY_MS;
  /** A moment on a day of the race, in UTC. */
  const at = (day: number, hours = 10): Date =>
    new Date(start + day * DAY_MS + hours * 60 * 60 * 1000);
  const passwordHash = await hashPassword(SEED_PASSWORD);

  return db.transaction().execute(async (trx) => {
    const existing = await trx
      .selectFrom("user")
      .select((eb) => eb.fn.countAll<string>().as("count"))
      .executeTakeFirstOrThrow();
    if (Number(existing.count) > 0) {
      throw new Error(
        "The database already has people: the seed fills an empty database only",
      );
    }

    const personIds = new Map<PersonKey, string>();
    const seeded: SeededPerson[] = [];
    for (const person of people) {
      const joined = person.joinedDay === null ? now : at(person.joinedDay, 9);
      const row = await users.insert(trx, {
        email: person.email ?? `seed-${person.key}@anonymous.invalid`,
        displayName: person.displayName,
        avatarKey: null,
        role: person.role,
        color: person.color,
        locale: person.locale,
        onboardedAt:
          person.joinedDay === null || person.role === "anonymous"
            ? null
            : joined,
        createdAt: joined,
        updatedAt: joined,
      });
      // An anonymous viewer's email is made of their id, known once inserted.
      const email = person.email ?? `${row.id}@anonymous.invalid`;
      if (person.email === null) {
        await users.update(trx, row.id, { email });
      }
      personIds.set(person.key, row.id);

      const key = randomBytes(32).toString("base64url");
      await accessKeys.insert(trx, {
        userId: row.id,
        codeHash: createHash("sha256").update(key).digest("hex"),
        claimedAt: person.joinedDay === null ? null : joined,
        accessUntil: null,
        revokedAt: null,
        createdBy:
          person.role === "admin" ? null : (personIds.get("alex") ?? null),
        createdAt: joined,
        ...(person.joinedDay === null
          ? {}
          : { claimBefore: new Date(joined.getTime() + 7 * DAY_MS) }),
      });

      if (person.joinedDay !== null && person.role !== "anonymous") {
        await trx
          .insertInto("account")
          .values({
            accountId: row.id,
            providerId: "credential",
            userId: row.id,
            accessToken: null,
            refreshToken: null,
            idToken: null,
            accessTokenExpiresAt: null,
            refreshTokenExpiresAt: null,
            scope: null,
            password: passwordHash,
            createdAt: joined,
            updatedAt: joined,
          })
          .execute();
      }

      const linked = person.role === "anonymous" || person.joinedDay === null;
      seeded.push({
        displayName: person.displayName,
        email,
        role: person.role,
        accessLink: linked
          ? `${publicUrl.replace(/\/$/, "")}/access/${key}`
          : null,
      });
    }
    const personId = (key: PersonKey): string => {
      const id = personIds.get(key);
      if (id === undefined) throw new Error(`No seeded person ${key}`);
      return id;
    };

    const shareIds = new Map<ShareKey, string>();
    let priceCount = 0;
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
        createdAt: at(0, 8),
      });
      shareIds.set(listing.key, share.id);
      const closes = invent(
        listing,
        index,
        start - 7 * DAY_MS,
        today,
        timeZone,
      );
      await trx
        .insertInto("prices")
        .values(closes.map((close) => ({ ...close, shareId: share.id })))
        .execute();
      priceCount += closes.length;
    }

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
        createdAt: at(manual.createdDay, 8),
      });
      shareIds.set(manual.key, share.id);
      for (const point of manual.valuePoints) {
        // Before the day's share changes, so a first purchase has a value.
        const moment = at(point.day, 9);
        const first = point.edited ?? point;
        await manualPriceEvents.insert(trx, {
          shareId: share.id,
          at: moment,
          action: "added",
          priceEur: first.priceEur,
          previousPriceEur: null,
          userId: personId(first.enteredBy),
          createdAt: moment,
        });
        if (point.edited) {
          await manualPriceEvents.insert(trx, {
            shareId: share.id,
            at: moment,
            action: "edited",
            priceEur: point.priceEur,
            previousPriceEur: point.edited.priceEur,
            userId: personId(point.enteredBy),
            createdAt: new Date(moment.getTime() + DAY_MS),
          });
        }
        await trx
          .insertInto("prices")
          .values({
            shareId: share.id,
            at: moment,
            priceEur: point.priceEur,
            source: "manual",
            enteredBy: personId(point.enteredBy),
            createdAt: moment,
          })
          .execute();
        priceCount += 1;
      }
    }
    const shareId = (key: ShareKey): string => {
      const id = shareIds.get(key);
      if (id === undefined) throw new Error(`No seeded share ${key}`);
      return id;
    };

    for (const change of changes) {
      const userId = personId(change.person);
      await portfolioChanges.insert(trx, {
        userId,
        shareId: shareId(change.share),
        quantityDelta: change.quantity,
        effectiveAt: at(change.day),
        createdBy: userId,
        createdAt: at(change.day),
      });
    }

    for (const balance of cash) {
      const userId = personId(balance.person);
      await cashBalances.insert(trx, {
        userId,
        amountEur: balance.amountEur,
        effectiveAt: at(balance.day),
        createdBy: userId,
        createdAt: at(balance.day),
      });
    }

    return {
      password: SEED_PASSWORD,
      people: seeded,
      counts: {
        people: people.length,
        shares: listings.length + manualShares.length,
        prices: priceCount,
        portfolioChanges: changes.length,
        cashBalances: cash.length,
      },
    };
  });
}
