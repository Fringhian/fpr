import type { CashBalance, PortfolioChange, Price, Share, User } from "@fpr/db";

/**
 * The invented race `pnpm db:seed` writes. Every person, email, and manual
 * share here is made up. The listings are widely traded ones, and their
 * closes are invented. Moments are days after the race's start, about eight
 * months before the seed runs.
 */

/** Every password user signs in with this password. */
export const SEED_PASSWORD = "development password";

/** How many days before the seed runs the race starts. */
export const RACE_LENGTH_DAYS = 240;

export type PersonKey =
  | "alex"
  | "sam"
  | "robin"
  | "charlie"
  | "jordan"
  | "camille"
  | "morgan"
  | "viewer";

/**
 * A person's columns, with seed-only fields: a key the other entries refer
 * to, since ids don't exist yet, and the day they joined.
 */
export interface SeedPerson
  extends Pick<User, "displayName" | "role" | "color" | "locale"> {
  key: PersonKey;
  /** Empty for the anonymous viewer, who gets `<id>@anonymous.invalid`. */
  email: string | null;
  /**
   * The day the admin added them. `null`: added when the seed runs, with a
   * link waiting for first use.
   */
  joinedDay: number | null;
}

export const people: readonly SeedPerson[] = [
  {
    key: "alex",
    displayName: "Alex Rivière",
    email: "alex@example.com",
    role: "admin",
    color: 1,
    locale: "fr",
    joinedDay: 0,
  },
  {
    key: "sam",
    displayName: "Sam Dubois",
    email: "sam@example.com",
    role: "member",
    color: 2,
    locale: "en",
    joinedDay: 8,
  },
  {
    key: "robin",
    displayName: "Robin Leclerc",
    email: "robin@example.com",
    role: "member",
    color: 3,
    locale: null,
    joinedDay: 18,
  },
  {
    key: "jordan",
    displayName: "Jordan Petit",
    email: "jordan@example.com",
    role: "member",
    color: 4,
    locale: "fr",
    joinedDay: 28,
  },
  {
    key: "charlie",
    displayName: "Charlie Moreau",
    email: "charlie@example.com",
    role: "member",
    color: 5,
    locale: "en",
    joinedDay: 125,
  },
  {
    key: "camille",
    displayName: "Camille Roux",
    email: "camille@example.com",
    role: "member",
    color: 6,
    locale: null,
    joinedDay: null,
  },
  {
    key: "morgan",
    displayName: "Morgan Blanc",
    email: "morgan@example.com",
    role: "guest",
    color: 7,
    locale: "fr",
    joinedDay: 60,
  },
  {
    key: "viewer",
    displayName: "Reviewer",
    email: null,
    role: "anonymous",
    color: 8,
    locale: null,
    joinedDay: 90,
  },
];

export type ListingKey = "apple" | "microsoft" | "lvmh" | "asml" | "spy";

/** The listing columns a market share always has. */
type ListingColumns = "providerSymbol" | "exchange" | "tradingCurrency";

/**
 * A market share's columns, with its listing set, and the seed-only fields
 * its closes are invented from.
 */
export interface SeedListing
  extends Pick<Share, "isin" | "name">,
    Readonly<{ [Column in ListingColumns]: NonNullable<Share[Column]> }> {
  key: ListingKey;
  /** The invented close, in EUR, a week before the race starts. */
  firstCloseEur: number;
  /** The mean change of the log price per trading day. */
  drift: number;
  /** The spread of the log price's change per trading day. */
  volatility: number;
}

export const listings: readonly SeedListing[] = [
  {
    key: "apple",
    isin: "US0378331005",
    name: "Apple Inc.",
    providerSymbol: "AAPL.US",
    exchange: "US",
    tradingCurrency: "USD",
    firstCloseEur: 185,
    drift: 0.0006,
    volatility: 0.016,
  },
  {
    key: "microsoft",
    isin: "US5949181045",
    name: "Microsoft Corporation",
    providerSymbol: "MSFT.US",
    exchange: "US",
    tradingCurrency: "USD",
    firstCloseEur: 390,
    drift: 0.0004,
    volatility: 0.014,
  },
  {
    key: "lvmh",
    isin: "FR0000121014",
    name: "LVMH Moët Hennessy Louis Vuitton",
    providerSymbol: "MC.PA",
    exchange: "PA",
    tradingCurrency: "EUR",
    firstCloseEur: 640,
    drift: -0.0002,
    volatility: 0.018,
  },
  {
    key: "asml",
    isin: "NL0010273215",
    name: "ASML Holding N.V.",
    providerSymbol: "ASML.AS",
    exchange: "AS",
    tradingCurrency: "EUR",
    firstCloseEur: 690,
    drift: 0.0008,
    volatility: 0.022,
  },
  {
    key: "spy",
    isin: "US78462F1030",
    name: "SPDR S&P 500 ETF Trust",
    providerSymbol: "SPY.US",
    exchange: "US",
    tradingCurrency: "USD",
    firstCloseEur: 520,
    drift: 0.0005,
    volatility: 0.009,
  },
];

export type ManualShareKey = "realEstate" | "privateEquity";

/** A manual price, entered by a seeded person on a day of the race. */
export interface SeedValuePoint extends Pick<Price, "priceEur"> {
  day: number;
  enteredBy: PersonKey;
  /** The value first entered, when someone edited it since. */
  edited?: Pick<Price, "priceEur"> & { enteredBy: PersonKey };
}

export interface SeedManualShare extends Pick<Share, "isin" | "name"> {
  key: ManualShareKey;
  createdBy: PersonKey;
  createdDay: number;
  valuePoints: readonly SeedValuePoint[];
}

export const manualShares: readonly SeedManualShare[] = [
  {
    key: "realEstate",
    isin: "FRSEEDREAL09",
    name: "Example Real Estate Crowdfunding",
    createdBy: "robin",
    createdDay: 20,
    valuePoints: [
      { day: 20, priceEur: "10", enteredBy: "robin" },
      { day: 50, priceEur: "10.15", enteredBy: "robin" },
      { day: 80, priceEur: "10.32", enteredBy: "robin" },
      {
        day: 110,
        priceEur: "10.40",
        enteredBy: "alex",
        edited: { priceEur: "10.35", enteredBy: "robin" },
      },
      { day: 140, priceEur: "10.61", enteredBy: "robin" },
      { day: 170, priceEur: "10.66", enteredBy: "alex" },
      { day: 200, priceEur: "10.90", enteredBy: "robin" },
      { day: 230, priceEur: "11.02", enteredBy: "robin" },
    ],
  },
  {
    key: "privateEquity",
    isin: "FRSEEDPEQF01",
    name: "Example Private Equity Fund",
    createdBy: "robin",
    createdDay: 20,
    valuePoints: [
      { day: 20, priceEur: "1000", enteredBy: "robin" },
      { day: 100, priceEur: "1080", enteredBy: "robin" },
      { day: 160, priceEur: "1135.50", enteredBy: "robin" },
      { day: 220, priceEur: "1190", enteredBy: "robin" },
    ],
  },
];

export type ShareKey = ListingKey | ManualShareKey;

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
