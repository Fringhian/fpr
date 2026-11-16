import type { Period, Person, ShareList } from "@fpr/contracts";
import { currentPositions, shareLists } from "@fpr/db";
import { toPerson } from "../me/me.js";
import type { ApiServices } from "../orpc.js";
import { raceMembers } from "../valuation/race-window.js";
import { chartPoints, shareQuotes } from "./quotes.js";

type ReadServices = Pick<ApiServices, "db" | "series" | "raceTimeZone">;

/** The members holding each share now, by share id. */
async function holdersByShare(
  db: ReadServices["db"],
): Promise<Map<string, Person[]>> {
  const [positions, members] = await Promise.all([
    currentPositions.listAll(db),
    raceMembers(db),
  ]);
  const people = new Map(members.map((member) => [member.id, member]));
  const holders = new Map<string, Person[]>();
  for (const { shareId, userId } of positions) {
    const person = people.get(userId);
    if (person !== undefined) {
      holders.set(shareId, [...(holders.get(shareId) ?? []), toPerson(person)]);
    }
  }
  return holders;
}

/**
 * `GET /shares?q=&period=`: the stored shares whose name, ISIN, or symbol
 * contains `q`, held ones first, most holders first, then by name. Postgres
 * alone answers it: the provider is never called.
 */
export async function searchShares(
  context: ReadServices,
  input: { q: string; period: Period },
): Promise<ShareList> {
  const [matches, holders] = await Promise.all([
    shareLists.matching(context.db, input.q),
    holdersByShare(context.db),
  ]);
  const ids = matches.map(({ id }) => id);
  const { window, quote } = await shareQuotes(context, ids, input.period);
  const series = await chartPoints(context, ids, {
    window,
    period: input.period,
    intraday: "since last close",
  });
  const shares = matches.map((share) => ({
    ...quote(share),
    series: series.get(share.id) ?? [],
    holders: holders.get(share.id) ?? [],
  }));
  return {
    shares: shares.sort((a, b) => b.holders.length - a.holders.length),
  };
}
