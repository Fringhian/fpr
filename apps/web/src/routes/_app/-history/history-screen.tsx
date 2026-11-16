import type { Id } from "@fpr/contracts";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/atoms/button/button";
import { Card } from "../../../components/atoms/card/card";
import { LoadingPlaceholder } from "../../../components/atoms/loading-placeholder/loading-placeholder";
import { PageMessage } from "../../../components/templates/page-message/page-message";
import { useReadFailedText } from "../../../lib/api/errors";
import { neededReads } from "../../../lib/api/needed-reads";
import { cn } from "../../../lib/cn";
import { useSession } from "../../../lib/session/use-session";
import { Screen, type ScreenProps } from "../../-shell/screen";
import { useLoadFailedMessage } from "../../-states/load-failed";
import { EntryList } from "../-portfolio-sections/entry-list";
import type { LogRow } from "../-portfolio-sections/log-rows";
import { useLog } from "../-portfolio-sections/use-log";
import { usePortfolioRead } from "../-portfolio-sections/use-portfolio-reads";
import { useMoreOnScroll } from "./use-more-on-scroll";

type Log = ReturnType<typeof useLog>["log"];

/** The list's end: the next page loads as it nears the screen, says so while it does, and offers Retry when it fails. */
function ListEnd({ log }: { log: Log }) {
  const { t } = useTranslation();
  const end = useRef<HTMLDivElement>(null);
  const failedText = useReadFailedText(t("historyPage.moreFailed"));
  const failed = log.isFetchNextPageError;
  useMoreOnScroll(
    end,
    log.hasNextPage && !log.isFetchingNextPage && !failed,
    () => void log.fetchNextPage(),
  );

  return (
    <div ref={end} className="grid justify-items-center">
      {log.isFetchingNextPage ? (
        <LoadingPlaceholder className="w-full">
          {t("historyPage.loadingMore")}
        </LoadingPlaceholder>
      ) : null}
      {failed ? (
        <p
          role="alert"
          className="flex flex-wrap items-center justify-center gap-s text-s text-secondary"
        >
          {failedText}
          <Button size="s" onClick={() => void log.fetchNextPage()}>
            {t("pageStates.loadFailed.action")}
          </Button>
        </p>
      ) : null}
    </div>
  );
}

/** Every entry, newest first, in one card, the next page loading as the end nears. */
function Entries({
  userId,
  rows,
  log,
  none,
}: {
  userId: Id;
  rows: readonly LogRow[];
  log: Log;
  none: string;
}) {
  const { t } = useTranslation();

  return rows.length === 0 ? (
    <p className="text-m text-secondary">{none}</p>
  ) : (
    <Card
      className={cn(
        "grid gap-s",
        "px-m py-s",
        "tablet:px-l tablet:py-m",
        "desktop:px-l desktop:py-m",
      )}
    >
      <EntryList
        userId={userId}
        rows={rows}
        aria-label={t("pages.portfolioHistory")}
      />
      <ListEnd log={log} />
    </Card>
  );
}

/**
 * Every share change and cash balance of `userId`'s portfolio, newest first,
 * loading more as the page scrolls, each with ⋯ to edit or delete it, below
 * `back`; `none` says there is nothing yet. No period bar.
 */
export function HistoryView({
  userId,
  back,
  none,
}: {
  userId: Id;
  back: ScreenProps["back"];
  none: string;
}) {
  const { t } = useTranslation();
  const portfolio = usePortfolioRead(userId);
  const { log, rows } = useLog(userId, portfolio.data);
  const reads = neededReads([portfolio, log]);
  const failed = useLoadFailedMessage(reads.retry);

  const title = t("pages.portfolioHistory");

  return (
    <Screen title={title} back={back}>
      {reads.failed ? (
        <PageMessage {...failed} />
      ) : (
        <div className="grid gap-m pb-l">
          <h1
            className={cn(
              "font-semibold text-primary",
              "text-xl",
              "tablet:text-display",
              "desktop:text-display",
            )}
          >
            {title}
          </h1>
          {rows === undefined ? (
            <LoadingPlaceholder className="h-[20rem]">
              {t("historyPage.loading")}
            </LoadingPlaceholder>
          ) : (
            <Entries userId={userId} rows={rows} log={log} none={none} />
          )}
        </div>
      )}
    </Screen>
  );
}

/** History: every change the viewer recorded, below Portfolio. */
export function HistoryScreen() {
  const { t } = useTranslation();
  const { person } = useSession();

  return (
    <HistoryView
      userId={person.id}
      back="portfolio"
      none={t("historyPage.none")}
    />
  );
}
