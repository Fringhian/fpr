import type { Gain } from "@fpr/contracts";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "../../../components/atoms/badge/badge";
import { Picture } from "../../../components/atoms/picture/picture";
import { cn } from "../../../lib/cn";
import { formatDate } from "../../../lib/format/date";
import { HelpInfo } from "../../../lib/help-info";
import { useLanguage } from "../../../lib/i18n";
import { lookOf } from "../../../lib/look";
import { useViewState } from "../../../lib/view-state/use-view-state";
import { MemberSentence } from "./member-sentence";
import type { MemberRow } from "./use-member-data";

/** “In the race since 12 Jan 2026 · 5 shares”, from tablet up. */
function InRace({ since, count }: { since: string; count: number }) {
  const { t } = useTranslation();
  const language = useLanguage();

  return (
    <p
      className={cn(
        "text-xs text-secondary",
        "hidden",
        "tablet:block",
        "desktop:block",
      )}
    >
      {t("memberPage.inRace", {
        date: formatDate(since, language, { year: true }),
      })}
      {" · "}
      {t("memberPage.shares", { count })}
    </p>
  );
}

/** The incomplete badge, and ⓘ, which says why. */
function Incomplete() {
  const { t } = useTranslation();

  return (
    <span className="inline-flex items-center gap-xs">
      <Badge state="incomplete" />
      <HelpInfo section="missing" title={t("helpInfo.incomplete.title")}>
        {t("helpInfo.incomplete.body")}
      </HelpInfo>
    </span>
  );
}

/**
 * A member's header on the sky: their picture and name, the page's heading;
 * once they have started, their result for the period compared with the
 * viewer's, and since when they are in the race with how many shares; then
 * the page's action, when there is one.
 */
export function MemberHeader({
  row,
  yours,
  action,
}: {
  row: MemberRow;
  /** The viewer's gain over the period, when they are in the race too. */
  yours: Gain | undefined;
  /** The admin's `HeaderAction`: Edit portfolio, or Record a change for them. */
  action?: ReactNode;
}) {
  const { setting } = useViewState();

  const look = lookOf(row.member);

  return (
    <div className="flex items-center gap-m">
      <Picture
        aria-hidden
        {...look}
        size="l"
        className={cn(
          "",
          "size-[3rem] text-l",
          "tablet:size-[5.5rem] tablet:text-display",
          "desktop:size-[5.5rem] desktop:text-display",
        )}
      />
      <div className="grid min-w-0 grow gap-xs">
        <h1
          className={cn(
            "truncate font-semibold text-primary",
            "text-xl",
            "tablet:text-display",
            "desktop:text-display",
          )}
        >
          {look.name}
        </h1>
        {row.gain === null ? null : (
          <MemberSentence
            name={look.name}
            gain={row.gain}
            yours={yours}
            {...setting}
          />
        )}
        {row.firstEntryOn === null ? null : (
          <div className="flex flex-wrap items-center gap-x-s gap-y-xs">
            <InRace since={row.firstEntryOn} count={row.holdingCount} />
            {row.incomplete ? <Incomplete /> : null}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}
