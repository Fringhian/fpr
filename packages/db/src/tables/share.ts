import type { Generated, Insertable, Selectable, Updateable } from "kysely";

/** `market`: priced by the provider. `manual`: priced by value points members enter. */
export type ShareKind = "market" | "manual";

/** One row per share a member looked up at the provider, and per manual share. */
export interface ShareTable {
  id: Generated<string>;
  /** Unique: two letters, nine letters or digits, and a check digit. */
  isin: string;
  /** Not empty. */
  name: string;
  kind: ShareKind;
  /** The 3-letter code the provider quotes the share in, such as `USD` or `GBX`. Set for a market share. */
  tradingCurrency: string | null;
  /** The provider's symbol of the one listing FPR prices. Set for a market share, empty for a manual one. */
  providerSymbol: string | null;
  /** The exchange of that listing. Set for a market share, empty for a manual one. */
  exchange: string | null;
  /** `YYYY-MM-DD`: the provider's earliest close, once a history fetch finds nothing earlier. */
  historyStartsOn: string | null;
  /** The member who created a manual share. Empty for a market share, and once that person is deleted. */
  createdBy: string | null;
  createdAt: Generated<Date>;
}

export type Share = Selectable<ShareTable>;
export type NewShare = Insertable<ShareTable>;
export type ShareUpdate = Updateable<ShareTable>;
