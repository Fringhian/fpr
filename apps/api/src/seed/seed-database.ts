import type { Db } from "@fpr/db";
import { hashPassword } from "better-auth/crypto";
import { people, SEED_PASSWORD } from "./data/people.js";
import { cash, changes } from "./data/portfolios.js";
import { listings, manualShares } from "./data/shares.js";
import { raceClock } from "./seed-clock.js";
import { type SeededPerson, seedPeople } from "./seed-people.js";
import { seedCashBalances, seedPortfolioChanges } from "./seed-portfolios.js";
import { seedShares } from "./seed-shares.js";

/** Stops when `NODE_ENV` is `production`: the seed is for development only. */
export function refuseProduction(nodeEnv: string | undefined): void {
  if (nodeEnv === "production") {
    throw new Error("The seed does not run when NODE_ENV is production");
  }
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
  {
    publicUrl,
    timeZone,
    now = new Date(),
  }: {
    /** `PUBLIC_URL`: the access links start with it. */
    publicUrl: string;
    /** `RACE_TIMEZONE`: closes are stored at 23:59:59 of their day in it. */
    timeZone: string;
    /** The seed's clock. The race ends the day before. */
    now?: Date;
  },
): Promise<SeedResult> {
  const clock = raceClock(now);
  const passwordHash = await hashPassword(SEED_PASSWORD);

  return db.transaction().execute(async (trx) => {
    await refuseNonEmpty(trx);
    const { personId, signIns } = await seedPeople(trx, {
      clock,
      publicUrl,
      passwordHash,
    });
    const { shareId, prices } = await seedShares(trx, {
      clock,
      timeZone,
      personId,
    });
    await seedPortfolioChanges(trx, { clock, personId, shareId });
    await seedCashBalances(trx, { clock, personId });

    return {
      password: SEED_PASSWORD,
      people: signIns,
      counts: {
        people: people.length,
        shares: listings.length + manualShares.length,
        prices,
        portfolioChanges: changes.length,
        cashBalances: cash.length,
      },
    };
  });
}

async function refuseNonEmpty(trx: Db): Promise<void> {
  const existing = await trx
    .selectFrom("user")
    .select((eb) => eb.fn.countAll<string>().as("count"))
    .executeTakeFirstOrThrow();
  if (Number(existing.count) > 0) {
    throw new Error(
      "The database already has people: the seed fills an empty database only",
    );
  }
}
