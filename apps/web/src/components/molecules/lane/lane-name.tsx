import type { Decimal, IsoDate } from "@fpr/contracts";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { formatDate } from "../../../lib/format/date";
import { useLanguage } from "../../../lib/i18n";
import { Badge } from "../../atoms/badge/badge";

/** A member's best holding over the period, the share that did best for them. */
export interface LaneBest {
  share: string;
  /** Its gain over the period, in percent, or `null` from a start at zero. */
  percent: Decimal | null;
}

/** “· you” after the viewer's own name, in a lane or the focus panel. */
export function YouSuffix() {
  const { t } = useTranslation();

  return <span className="font-normal text-secondary"> {t("lane.you")}</span>;
}

/** “since 12 Feb” and “Incomplete”, when they apply. */
function Markers({
  measuredFrom,
  incomplete,
}: {
  measuredFrom: IsoDate | null;
  incomplete: boolean;
}) {
  const { t } = useTranslation();
  const language = useLanguage();

  return incomplete || measuredFrom !== null ? (
    <span className="flex flex-wrap items-center gap-x-s gap-y-xs pt-xs">
      {measuredFrom === null ? null : (
        <span className="text-xs text-secondary">
          {t("lane.since", { date: formatDate(measuredFrom, language) })}
        </span>
      )}
      {incomplete ? <Badge state="incomplete" /> : null}
    </span>
  ) : null;
}

export type NameProps = {
  /** The member's display name, or an anonymous viewer's pseudonym. */
  name: string;
  /** The viewer's own lane: “· you” after the name. */
  you?: boolean | undefined;
  /** The member's best share over the period, under the name on tablet and desktop. `null` when they held no priced share. */
  best?: LaneBest | null | undefined;
  /** The day the member's history starts when it is after the period's start: the lane says “since 12 Feb”. */
  measuredFrom?: IsoDate | null | undefined;
  /** A held share has no price yet: the lane says “Incomplete”. */
  incomplete?: boolean | undefined;
} & Omit<
  ComponentProps<"span">,
  "name" | "you" | "best" | "measuredFrom" | "incomplete" | "children"
>;

/** The name, then the best share from tablet up, then “since” and “Incomplete” when they apply. */
export function Name({
  name,
  you = false,
  best = null,
  measuredFrom = null,
  incomplete = false,
  className,
  ...props
}: NameProps) {
  const { t } = useTranslation();

  return (
    <span {...props} className={cn("flex min-w-0 flex-col", className)}>
      <span
        className={cn(
          "truncate font-semibold",
          "text-s",
          "tablet:text-m",
          "desktop:text-m",
        )}
      >
        {name}
        {you ? <YouSuffix /> : null}
      </span>
      {best ? (
        <span
          className={cn(
            "truncate text-xs text-secondary",
            "hidden",
            "tablet:block",
            "desktop:block",
          )}
        >
          {t("lane.best", { share: best.share })}
        </span>
      ) : null}
      <Markers measuredFrom={measuredFrom} incomplete={incomplete} />
    </span>
  );
}
