import type { Gain } from "@fpr/contracts";
import { useTranslation } from "react-i18next";
import { Badge } from "../../../components/atoms/badge/badge";
import { Picture } from "../../../components/atoms/picture/picture";
import { cn } from "../../../lib/cn";
import { formatDate } from "../../../lib/format/date";
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

/**
 * A member's header on the sky: their picture and name, the page's heading;
 * once they have started, their result for the period compared with the
 * viewer's, and since when they are in the race with how many shares.
 */
export function MemberHeader({
  row,
  yours,
}: {
  row: MemberRow;
  /** The viewer's gain over the period, when they are in the race too. */
  yours: Gain | undefined;
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
      <div className="grid min-w-0 gap-xs">
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
            {row.incomplete ? <Badge state="incomplete" /> : null}
          </div>
        )}
      </div>
    </div>
  );
}
