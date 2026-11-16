import type { Members, Period } from "@fpr/contracts";
import { currentPositions, valuation } from "@fpr/db";
import { toPerson } from "../me/me.js";
import type { ApiServices } from "../orpc.js";
import { toShareSummary } from "../shares/share-summary.js";
import { Big, money, ratio, toGain } from "../valuation/decimal.js";
import { type HoldingNow, holdingsNow } from "../valuation/holdings-now.js";
import { measuredFrom, toSeriesPoints } from "../valuation/race-window.js";
import { standingsAt } from "./standings.js";

type ReadServices = Pick<ApiServices, "db" | "series" | "raceTimeZone">;

/** Each member's priced holdings now, largest first, by user id. */
function holdingsByMember(holdings: readonly HoldingNow[]) {
  const byMember = new Map<string, HoldingNow[]>();
  for (const holding of holdings) {
    byMember.set(holding.userId, [
      ...(byMember.get(holding.userId) ?? []),
      holding,
    ]);
  }
  return byMember;
}

/**
 * `GET /members?period=`: every member with their first entry, their closes
 * over the period, their gain and balance at the last close, and their three
 * largest holdings now. A member with no close yet has no gain, balance, or
 * series.
 */
export async function readMembers(
  context: ReadServices,
  input: { period: Period },
): Promise<Members> {
  const { db } = context;
  const [{ window, standings, notStarted }, positions, balances] =
    await Promise.all([
      standingsAt(context, input.period),
      currentPositions.listAll(db),
      valuation.balancesAt(db, {
        at: new Date(),
        timeZone: context.raceTimeZone,
      }),
    ]);
  const holdings = holdingsByMember(await holdingsNow(db, positions));
  const rows = [
    ...standings.map((standing) => ({ member: standing.member, standing })),
    ...notStarted.map((member) => ({ member, standing: undefined })),
  ];
  return {
    members: rows.map(({ member, standing }) => {
      const { id } = member;
      const held = holdings.get(id) ?? [];
      const balance = new Big(balances.get(id)?.balanceEur ?? 0);
      return {
        member: toPerson(member),
        firstEntryOn: window.firstEntries.get(id)?.day ?? null,
        measuredFrom: measuredFrom(window, id),
        incomplete: standing?.end.incomplete ?? false,
        gain: standing === undefined ? null : toGain(standing.gain),
        balanceEur:
          standing === undefined
            ? null
            : money(new Big(standing.end.balanceEur)),
        series: standing === undefined ? [] : toSeriesPoints(standing.closes),
        topHoldings: held
          .flatMap(({ share, valueEur }) =>
            valueEur === null
              ? []
              : [
                  {
                    share: toShareSummary(share),
                    weight: ratio(valueEur, balance) ?? "0.00",
                  },
                ],
          )
          .slice(0, 3),
        holdingCount: held.length,
      };
    }),
  };
}
