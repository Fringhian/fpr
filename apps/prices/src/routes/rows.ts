import type { ShareSummary } from "@fpr/contracts";
import type { PricesValuePoint } from "@fpr/contracts/prices";
import {
  type Db,
  type Price,
  type Share,
  shares,
  violatedConstraint,
} from "@fpr/db";

/** A share as the contracts return it. */
export function toShareSummary(share: Share): ShareSummary {
  return {
    id: share.id,
    isin: share.isin,
    name: share.name,
    kind: share.kind,
    symbol: share.providerSymbol,
  };
}

/** A stored `manual` price as a value point. */
export function toValuePoint(price: Price): PricesValuePoint {
  return {
    at: price.at.toISOString(),
    priceEur: price.priceEur,
    enteredBy: price.enteredBy,
  };
}

/**
 * The id of the share that holds `isin`, when `error` is the unique ISIN
 * refusing a write: two writers raced for the same ISIN. `undefined` for any
 * other error.
 */
export async function isinTakenBy(
  error: unknown,
  db: Db,
  isin: string | undefined,
): Promise<string | undefined> {
  if (isin === undefined || violatedConstraint(error) !== "shares_isin_key") {
    return undefined;
  }
  return (await shares.findByIsin(db, isin))?.id;
}
