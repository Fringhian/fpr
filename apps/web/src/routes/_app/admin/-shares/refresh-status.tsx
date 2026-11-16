import type { RefreshState, Timestamp } from "@fpr/contracts";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { livePrices } from "../../../../lib/api/query-client";
import { useApi } from "../../../../lib/api/use-api";
import { formatDate, formatTime } from "../../../../lib/format/date";
import { useLanguage } from "../../../../lib/i18n";
import { raceDayOf, raceTimeZone, raceToday } from "../../../../lib/race-day";

function useWhen(): (at: Timestamp) => string {
  const { t } = useTranslation();
  const language = useLanguage();

  return (at) => {
    const timeZone = raceTimeZone();
    const time = formatTime(at, language, { timeZone });
    return raceDayOf(at) === raceToday()
      ? time
      : t("adminShares.refresh.dayTime", {
          day: formatDate(at, language, { style: "weekday", timeZone }),
          time,
        });
  };
}

function useRunsLine(): (state: RefreshState) => string {
  const { t } = useTranslation();
  const when = useWhen();

  return ({ lastRunAt, lastResult, nextRunAt }) => {
    const last =
      lastRunAt === null || lastResult === null
        ? t("adminShares.refresh.noRun")
        : t(`adminShares.refresh.lastRun.${lastResult.status}`, {
            time: when(lastRunAt),
            count: lastResult.sharesPriced,
            failures: lastResult.failures,
          });
    return nextRunAt === null
      ? last
      : `${last} · ${t("adminShares.refresh.next", { time: when(nextRunAt) })}`;
  };
}

/**
 * The price refresh's state: its last run and what it did, the next one,
 * then the day's runs and the provider calls left under the cap. While the
 * state loads, or when the price service doesn't answer, the schedule.
 */
export function RefreshStatus() {
  const { t } = useTranslation();
  const api = useApi();
  const runsLine = useRunsLine();
  const state = useQuery({
    ...api.admin.refreshState.queryOptions(),
    ...livePrices,
  });

  const { data } = state;
  return (
    <div role="status" className="grid gap-[0.125rem] text-s text-secondary">
      <p>{data ? runsLine(data) : t("adminShares.refresh.schedule")}</p>
      {data ? (
        <p className="text-xs">
          {t("adminShares.refresh.runsToday", { count: data.runsToday })}
          {" · "}
          {t("adminShares.refresh.callsLeft", {
            left: data.cap.callsLeft,
            limit: data.cap.callLimit,
          })}
        </p>
      ) : null}
    </div>
  );
}
