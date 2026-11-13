import type { Generated, Insertable, Selectable, Updateable } from "kysely";

/** What happened to a manual share's value point. */
export type ManualPriceAction = "added" | "edited" | "deleted";

/**
 * One row per value point added, edited, or deleted on a manual share: who
 * changed which value, and what it was before.
 */
export interface ManualPriceEventTable {
  id: Generated<string>;
  shareId: string;
  /** The moment of the value point concerned. */
  at: Date;
  action: ManualPriceAction;
  /** The new value, a decimal string above zero. Empty for `deleted`. */
  priceEur: string | null;
  /** The value before, a decimal string above zero. Empty for `added`. */
  previousPriceEur: string | null;
  /** Who made the change. Empty once that person is deleted. */
  userId: string | null;
  createdAt: Generated<Date>;
}

export type ManualPriceEvent = Selectable<ManualPriceEventTable>;
export type NewManualPriceEvent = Insertable<ManualPriceEventTable>;
export type ManualPriceEventUpdate = Updateable<ManualPriceEventTable>;
