import type { CashBalance, PortfolioChange } from "@fpr/db";
import type { PersonKey } from "./people.js";
import type { ShareKey } from "./shares.js";

/** A purchase, with a positive quantity, or a sale, with a negative one. */
export interface SeedChange extends Pick<PortfolioChange, "quantityDelta"> {
  person: PersonKey;
  share: ShareKey;
  day: number;
}

export const changes: readonly SeedChange[] = [
  { person: "alex", share: "apple", day: 5, quantityDelta: "12" },
  { person: "alex", share: "lvmh", day: 5, quantityDelta: "3" },
  { person: "alex", share: "spy", day: 40, quantityDelta: "6" },
  { person: "alex", share: "realEstate", day: 60, quantityDelta: "40" },
  { person: "alex", share: "apple", day: 110, quantityDelta: "-4" },
  { person: "alex", share: "asml", day: 150, quantityDelta: "2" },

  { person: "sam", share: "microsoft", day: 10, quantityDelta: "8" },
  { person: "sam", share: "spy", day: 10, quantityDelta: "10" },
  { person: "sam", share: "microsoft", day: 70, quantityDelta: "4" },
  { person: "sam", share: "spy", day: 180, quantityDelta: "-10" },
  { person: "sam", share: "asml", day: 185, quantityDelta: "3" },

  { person: "robin", share: "realEstate", day: 20, quantityDelta: "100" },
  { person: "robin", share: "privateEquity", day: 20, quantityDelta: "5" },
  { person: "robin", share: "lvmh", day: 90, quantityDelta: "2" },
  { person: "robin", share: "privateEquity", day: 160, quantityDelta: "2.5" },

  { person: "jordan", share: "spy", day: 30, quantityDelta: "3.5" },
  { person: "jordan", share: "asml", day: 30, quantityDelta: "1" },
  { person: "jordan", share: "lvmh", day: 100, quantityDelta: "1" },
  { person: "jordan", share: "asml", day: 140, quantityDelta: "-1" },
  { person: "jordan", share: "spy", day: 210, quantityDelta: "2" },

  { person: "charlie", share: "apple", day: 130, quantityDelta: "20" },
  { person: "charlie", share: "microsoft", day: 130, quantityDelta: "5" },
  { person: "charlie", share: "apple", day: 200, quantityDelta: "0.75" },
];

/** The cash a person holds from a day on, in EUR. */
export interface SeedCash extends Pick<CashBalance, "amountEur"> {
  person: PersonKey;
  day: number;
}

export const cash: readonly SeedCash[] = [
  { person: "alex", day: 5, amountEur: "500" },
  { person: "alex", day: 110, amountEur: "1200.50" },
  { person: "alex", day: 150, amountEur: "80" },
  { person: "sam", day: 10, amountEur: "0" },
  { person: "sam", day: 180, amountEur: "4800" },
  { person: "robin", day: 20, amountEur: "250" },
  { person: "jordan", day: 30, amountEur: "120" },
  { person: "jordan", day: 140, amountEur: "830" },
  { person: "charlie", day: 130, amountEur: "1000" },
  { person: "charlie", day: 200, amountEur: "640" },
];
