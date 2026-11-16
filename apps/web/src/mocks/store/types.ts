import type {
  Currency,
  Decimal,
  Id,
  Language,
  PriceSource,
  Role,
  ShareKind,
  Timestamp,
} from "@fpr/contracts";
import type { Calendar } from "./calendar.ts";

/** A person, with what the API keeps about their access and password. */
export type MockPerson = {
  id: Id;
  displayName: string;
  /** `null` for an anonymous viewer. */
  email: string | null;
  role: Role;
  color: number;
  language: Language | null;
  onboarded: boolean;
  avatar: File | null;
  avatarVersion: number;
  /** `null` until a password user claims their link, and for anonymous viewers. */
  password: string | null;
  /** Their current key: waiting for first use, or claimed. */
  keyClaimed: boolean;
  revoked: boolean;
  claimBeforeMs: number;
  accessUntilMs: number | null;
  addedAtMs: number;
};

export type StoredPrice = {
  atMs: number;
  priceEur: Decimal;
  source: PriceSource;
  /** Who entered a manual value point, or `null` once deleted. */
  enteredBy?: Id | null;
};

export type StoredValueEvent = {
  id: Id;
  atMs: number;
  madeBy: Id | null;
  madeAtMs: number;
  priceEur: Decimal | null;
  previousPriceEur: Decimal | null;
};

export type StoredShare = {
  id: Id;
  isin: string;
  name: string;
  kind: ShareKind;
  symbol: string | null;
  exchange: string | null;
  tradingCurrency: Currency | null;
  /** When it was stored: looked up, or created manual. */
  addedAtMs: number;
  /** Prices and value points, oldest first. */
  prices: StoredPrice[];
  valueEvents: StoredValueEvent[];
};

type StoredEntryFields = {
  id: Id;
  userId: Id;
  effectiveAt: Timestamp;
  atMs: number;
  /** Who recorded it: the member, or the admin for them. `null` once deleted. */
  madeBy: Id | null;
};

export type StoredChange = StoredEntryFields & {
  type: "change";
  shareId: Id;
  quantityDelta: Decimal;
};

export type StoredCash = StoredEntryFields & {
  type: "cash";
  amountEur: Decimal;
};

export type StoredEntry = StoredChange | StoredCash;

/**
 * Everything the mock API knows, in memory: reads compute from it and writes
 * change it, so a write shows in every later read.
 */
export type MockStore = {
  calendar: Calendar;
  /** The instance's race time zone, as `GET /me` names it. */
  raceTimeZone: string;
  people: MockPerson[];
  shares: StoredShare[];
  entries: StoredEntry[];
  /** Every access key ever made, by key. A replaced one names its successor. */
  accessKeys: Map<string, { userId: Id; replaced: boolean }>;
  resetKeys: Map<string, { userId: Id; expiresAtMs: number; used: boolean }>;
  /**
   * With `?mock-conflict`, the value points another member has changed
   * already, by their moment: the first edit or deletion of each finds it
   * changed. `null` when off.
   */
  conflicted: Set<number> | null;
  /**
   * The price refreshes the admin ran: whether one is going, how many have
   * run and when the last ended, and whether the price service stopped
   * answering, after the `offline` lookup.
   */
  refreshes: {
    running: boolean;
    count: number;
    lastRunMs: number | null;
    offline: boolean;
  };
  /** The signed-in person, or `null`. */
  session: Id | null;
  onSessionChange: (session: Id | null) => void;
};
