import { cashBalances, type Db, portfolioChanges } from "@fpr/db";
import type { PersonKey } from "./data/people.js";
import { cash, changes } from "./data/portfolios.js";
import type { ShareKey } from "./data/shares.js";
import type { RaceClock } from "./seed-clock.js";
import type { IdOf } from "./seed-ids.js";

/** Adds every share change, entered by its holder on the day it takes effect. */
export async function seedPortfolioChanges(
  trx: Db,
  {
    clock,
    personId,
    shareId,
  }: { clock: RaceClock; personId: IdOf<PersonKey>; shareId: IdOf<ShareKey> },
): Promise<void> {
  for (const change of changes) {
    const userId = personId(change.person);
    await portfolioChanges.insert(trx, {
      userId,
      shareId: shareId(change.share),
      quantityDelta: change.quantityDelta,
      effectiveAt: clock.at(change.day),
      createdBy: userId,
      createdAt: clock.at(change.day),
    });
  }
}

/** Adds every cash balance, entered by its holder on the day it takes effect. */
export async function seedCashBalances(
  trx: Db,
  { clock, personId }: { clock: RaceClock; personId: IdOf<PersonKey> },
): Promise<void> {
  for (const balance of cash) {
    const userId = personId(balance.person);
    await cashBalances.insert(trx, {
      userId,
      amountEur: balance.amountEur,
      effectiveAt: clock.at(balance.day),
      createdBy: userId,
      createdAt: clock.at(balance.day),
    });
  }
}
