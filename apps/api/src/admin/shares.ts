import {
  type AdminShare,
  type AdminShareGroups,
  apiContract,
  type Person,
} from "@fpr/contracts";
import {
  type AdminShareRow,
  attentionWindowStart,
  currentPositions,
  type Db,
  shares,
} from "@fpr/db";
import { apiError } from "../errors.js";
import { api } from "../implement.js";
import { peopleById } from "../me/me.js";
import { signedIn } from "../pipeline/index.js";
import { forwardRefusal } from "../prices/forward-refusal.js";

function toAdminShare(row: AdminShareRow, holders: Person[]): AdminShare {
  return {
    id: row.id,
    isin: row.isin,
    name: row.name,
    kind: row.kind,
    symbol: row.providerSymbol,
    exchange: row.exchange,
    addedAt: row.createdAt.toISOString(),
    latestPrice:
      row.latestAt === null ||
      row.latestPriceEur === null ||
      row.latestSource === null
        ? null
        : {
            at: row.latestAt.toISOString(),
            priceEur: row.latestPriceEur,
            source: row.latestSource,
          },
    holders,
    hasShareChanges: row.hasShareChanges,
  };
}

function groupOf(row: AdminShareRow): keyof AdminShareGroups {
  if (row.kind === "manual") {
    return "manual";
  }
  if (!row.held) {
    return "notHeld";
  }
  return row.needsAttention ? "needsAttention" : "tracked";
}

/**
 * Every stored share, by name, in its group. A share needs attention by the
 * same window the price service checks before making it manual.
 */
async function listAdminShares(
  db: Db,
  timeZone: string,
): Promise<AdminShareGroups> {
  const closesSince = attentionWindowStart(new Date(), timeZone);
  const [rows, positions, people] = await Promise.all([
    shares.listForAdmin(db, closesSince, timeZone),
    currentPositions.listAll(db),
    peopleById(db),
  ]);
  const groups: AdminShareGroups = {
    needsAttention: [],
    tracked: [],
    manual: [],
    notHeld: [],
  };
  const positionsByShare = Map.groupBy(positions, ({ shareId }) => shareId);
  for (const row of rows) {
    const holders = (positionsByShare.get(row.id) ?? []).flatMap(
      ({ userId }) => people.get(userId) ?? [],
    );
    groups[groupOf(row)].push(toAdminShare(row, holders));
  }
  return groups;
}

export const adminShareRoutes = {
  shares: api.admin.shares.handler(({ context }) =>
    listAdminShares(context.db, context.raceTimeZone),
  ),

  /** Made manual by the price service, with the admin as its first value's author. */
  makeManual: api.admin.makeManual
    .use(signedIn)
    .handler(async ({ context, input }) => {
      await context.prices
        .makeManual({ ...input, enteredBy: context.viewer.id })
        .catch(forwardRefusal(apiContract.admin.makeManual, context.req.log));
      context.series.clear();
      const groups = await listAdminShares(context.db, context.raceTimeZone);
      const share = groups.manual.find(({ id }) => id === input.id);
      if (share === undefined) {
        throw apiError("not_found");
      }
      return share;
    }),
};
