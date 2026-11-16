import type { Period, Race } from "@fpr/contracts";
import { type BalanceSeries, shareCharts } from "@fpr/db";
import { toPerson } from "../me/me.js";
import type { ApiServices } from "../orpc.js";
import {
  measuredFrom,
  raceMembers,
  raceWindow,
  toSeriesPoints,
  windowPoints,
} from "../valuation/race-window.js";

type ReadServices = Pick<ApiServices, "db" | "series" | "raceTimeZone">;

/**
 * How recent the last refresh is while refreshes run. The price service
 * refreshes every 30 minutes by default, and a run takes a few minutes.
 */
const RUNNING_WITHIN_MS = 45 * 60 * 1000;

/** Whether a refresh ran since the last close, recently enough that more follow. */
function refreshesRunning(series: BalanceSeries, now: Date): boolean {
  const refreshes = [...series.members.values()].flatMap((points) =>
    points.flatMap((point) => (point.provisional ? point.at.getTime() : [])),
  );
  return refreshes.some((at) => now.getTime() - at <= RUNNING_WITHIN_MS);
}

/**
 * `GET /race?period=`: each member's balance and gain since the period's
 * start at each close, then at each refresh since the last close, which is
 * provisional. A member with no point yet hasn't started.
 */
export async function readRace(
  context: ReadServices,
  input: { period: Period },
): Promise<Race> {
  const [window, members, latestPricesAt] = await Promise.all([
    raceWindow(context, input.period),
    raceMembers(context.db),
    shareCharts.latestPriceAt(context.db),
  ]);
  const lanes = members.map((member) => ({
    member,
    points: windowPoints(window, member.id, { closesOnly: false }),
  }));
  return {
    lastCloseOn: window.lastCloseOn,
    latestPricesAt: latestPricesAt?.toISOString() ?? null,
    refreshesRunning: refreshesRunning(window.series, new Date()),
    members: lanes.flatMap(({ member, points }) =>
      points.length === 0
        ? []
        : [
            {
              member: toPerson(member),
              measuredFrom: measuredFrom(window, member.id),
              incomplete: points.at(-1)?.incomplete ?? false,
              points: toSeriesPoints(points),
            },
          ],
    ),
    notStarted: lanes
      .filter(({ points }) => points.length === 0)
      .map(({ member }) => toPerson(member)),
  };
}
