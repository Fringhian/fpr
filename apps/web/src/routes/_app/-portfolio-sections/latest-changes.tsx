import type { Id } from "@fpr/contracts";
import { type ReactElement, useId } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../../../components/atoms/card/card";
import { LoadingPlaceholder } from "../../../components/atoms/loading-placeholder/loading-placeholder";
import { TextLink } from "../../../components/atoms/text-link/text-link";
import { cn } from "../../../lib/cn";
import { EntryList } from "./entry-list";
import type { LogRow } from "./log-rows";

/** The latest changes a portfolio shows; History has every one. */
const LATEST = 3;

/**
 * The card of the latest changes: the last three entries of the log, each
 * with its ⋯, then the link to History. It holds its place while the log
 * loads.
 */
export function LatestChanges({
  userId,
  rows,
  historyLink,
}: {
  userId: Id;
  /** The log as rows, newest first, or `undefined` while it loads. */
  rows: readonly LogRow[] | undefined;
  /** The router's link to the page with every change, such as `<Link to="/portfolio/history" />`. */
  historyLink: ReactElement;
}) {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <Card
      render={<section aria-labelledby={titleId} />}
      className={cn("grid gap-s", "p-m", "tablet:p-l", "desktop:p-l")}
    >
      <h2 id={titleId} className="text-m font-semibold text-primary">
        {t("latestChanges.title")}
      </h2>
      {rows === undefined ? (
        <LoadingPlaceholder className="h-[10rem]" />
      ) : (
        <EntryList userId={userId} rows={rows.slice(0, LATEST)} />
      )}
      <TextLink toPage render={historyLink} className="w-fit text-s">
        {t("latestChanges.seeAll")}
      </TextLink>
    </Card>
  );
}
