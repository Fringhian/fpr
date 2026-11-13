import type { Generated, Insertable, Selectable, Updateable } from "kysely";

/**
 * Where a price comes from: `close`, a daily closing price; `intraday`, the
 * 30-minute refresh; `manual`, a value point a member entered.
 */
export type PriceSource = "close" | "intraday" | "manual";

/** What one unit of a share was worth at a moment, in EUR. Keyed by (`shareId`, `at`). */
export interface PriceTable {
  shareId: string;
  at: Date;
  /** A decimal string above zero. */
  priceEur: string;
  source: PriceSource;
  /** The member who last entered or edited a `manual` price. Empty for any other source. */
  enteredBy: string | null;
  createdAt: Generated<Date>;
}

export type Price = Selectable<PriceTable>;
export type NewPrice = Insertable<PriceTable>;
export type PriceUpdate = Updateable<PriceTable>;
