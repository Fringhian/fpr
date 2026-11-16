import type { ApiContract } from "@fpr/contracts";
import { generateOperationKey } from "@orpc/tanstack-query";
import type { QueryClient, QueryKey } from "@tanstack/react-query";

type Area = keyof ApiContract & string;

/** A route by its area and key, such as `portfolio.addChange`. */
type RoutePath = {
  [A in Area]: `${A}.${keyof ApiContract[A] & string}`;
}[Area];

/**
 * The reads a write makes stale: every read of an area, such as `race`, or one
 * read, such as `shares.holders`. A write that starts a session makes
 * everything stale.
 */
type Stale = readonly (Area | RoutePath)[] | "everything";

/** Every read a share's price or name shows in. */
const valuation = ["portfolio", "race", "shares", "admin.shares"] as const;

/** Every read a person's name, colour, picture or role shows in. */
const person = ["me", "race", "shares.holders", "admin.people"] as const;

/** A share change moves holdings, so also each share's holders. */
const shareChange = [
  "portfolio",
  "race",
  "shares.search",
  "shares.get",
  "shares.holders",
  "admin.shares",
] as const;

/** A cash balance moves balances and every holding's weight. */
const cashBalance = ["portfolio", "race", "shares.get"] as const;

/**
 * What each write of the contracts invalidates once it succeeds, read by the
 * query client after every mutation. A test fails when a write is missing.
 */
export const invalidations = {
  "access.setup": "everything",
  "access.check": [],
  "access.claim": "everything",
  "access.signIn": "everything",
  "access.checkReset": [],
  "access.reset": "everything",

  "me.update": person,
  "me.setAvatar": person,
  "me.deleteAvatar": person,

  "portfolio.addChange": shareChange,
  "portfolio.updateChange": shareChange,
  "portfolio.deleteChange": shareChange,
  "portfolio.setCash": cashBalance,
  "portfolio.updateCash": cashBalance,
  "portfolio.deleteCash": cashBalance,

  "shares.lookup": ["shares.search", "admin.shares"],
  "shares.createManual": ["shares.search", "admin.shares"],
  "shares.update": valuation,
  "shares.addValue": valuation,
  "shares.updateValue": valuation,
  "shares.deleteValue": valuation,
  "shares.delete": ["shares", "admin.shares"],

  "admin.addPerson": ["admin.people", "race"],
  "admin.updatePerson": person,
  "admin.revoke": ["admin.people", "race"],
  "admin.restore": ["admin.people", "race"],
  "admin.replaceLink": ["admin.people"],
  "admin.resetKey": ["admin.people"],
  "admin.deletePerson": [...valuation, "admin.people"],
  "admin.makeManual": valuation,
  "admin.refreshPrices": valuation,
} as const satisfies Partial<Record<RoutePath, Stale>>;

function staleAfter(mutationKey: QueryKey | undefined): Stale | undefined {
  const path = mutationKey?.[0];
  if (!Array.isArray(path)) {
    return undefined;
  }
  const table: Partial<Record<string, Stale>> = invalidations;
  return table[path.join(".")];
}

/**
 * Invalidates the reads a successful write makes stale, found from the
 * write's oRPC mutation key, `[["portfolio", "addChange"], …]`. An oRPC query
 * key starts with its route's path, so the path of an area, `["race"]`,
 * matches every read in it.
 */
export async function invalidateAfter(
  queryClient: QueryClient,
  mutationKey: QueryKey | undefined,
): Promise<void> {
  const stale = staleAfter(mutationKey);
  if (stale === undefined) {
    return;
  }
  if (stale === "everything") {
    await queryClient.invalidateQueries();
    return;
  }
  await Promise.all(
    stale.map((read) =>
      queryClient.invalidateQueries({
        queryKey: generateOperationKey(read.split(".")),
      }),
    ),
  );
}
