import type {
  PortfolioCashBalance,
  PortfolioChange,
  PortfolioLogEntry,
} from "@fpr/contracts";
import { type Db, type PortfolioLogRow, portfolioLog } from "@fpr/db";
import { apiError } from "../errors.js";

type ChangeRow = Extract<PortfolioLogRow, { type: "change" }>;
type CashRow = Extract<PortfolioLogRow, { type: "cash" }>;

export function toChange(row: ChangeRow): PortfolioChange {
  const { share } = row;
  return {
    type: "change",
    id: row.id,
    share: {
      id: share.id,
      isin: share.isin,
      name: share.name,
      kind: share.kind,
      symbol: share.providerSymbol,
    },
    quantityDelta: row.quantityDelta,
    effectiveAt: row.effectiveAt.toISOString(),
    madeBy: row.madeBy,
  };
}

export function toCash(row: CashRow): PortfolioCashBalance {
  return {
    type: "cash",
    id: row.id,
    amountEur: row.amountEur,
    effectiveAt: row.effectiveAt.toISOString(),
    madeBy: row.madeBy,
  };
}

export function toLogEntry(row: PortfolioLogRow): PortfolioLogEntry {
  return row.type === "change"
    ? { ...toChange(row), quantityAfter: row.quantityAfter }
    : { ...toCash(row), previousAmountEur: row.previousAmountEur };
}

/** A person's share change as the routes answer it. */
export async function readChange(
  db: Db,
  userId: string,
  id: string,
): Promise<PortfolioChange> {
  const row = await portfolioLog.find(db, userId, id);
  if (row?.type !== "change") {
    throw apiError("not_found");
  }
  return toChange(row);
}

/** A person's cash balance as the routes answer it. */
export async function readCash(
  db: Db,
  userId: string,
  id: string,
): Promise<PortfolioCashBalance> {
  const row = await portfolioLog.find(db, userId, id);
  if (row?.type !== "cash") {
    throw apiError("not_found");
  }
  return toCash(row);
}
