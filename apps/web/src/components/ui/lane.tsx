import { Collapsible } from "@base-ui/react/collapsible";
import type { ComponentProps, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import {
  type Decimal,
  formatDate,
  formatMoney,
  type IsoDate,
} from "../../lib/format";
import { useLanguage } from "../../lib/i18n";
import {
  type LaneScale,
  type LaneValue,
  laneAmount,
  laneBar,
} from "../../lib/lane";
import type { Language } from "../../lib/language";
import type { MemberColor } from "../../lib/member-color";
import { Badge } from "./badge";
import { Chip } from "./chip";
import { GainValue } from "./gain-value";
import { Picture, type PictureMedal } from "./picture";

/** The bar in each member colour. */
const BARS = {
  vermilion: "bg-vermilion",
  cobalt: "bg-cobalt",
  green: "bg-green",
  violet: "bg-violet",
  amber: "bg-amber",
  pink: "bg-pink",
  cyan: "bg-cyan",
  lime: "bg-lime",
  sienna: "bg-sienna",
  periwinkle: "bg-periwinkle",
} as const satisfies Record<MemberColor, string>;

/** A member's best holding over the period, the share that did best for them. */
export interface LaneBest {
  /** The share's name. */
  share: string;
  /** Its gain over the period, in percent, or `null` from a start at zero. */
  percent: Decimal | null;
}

interface LaneOwnProps {
  /** The member's display name, or an anonymous viewer's pseudonym. */
  name: string;
  /** The member's colour: their picture's pastel and their bar. */
  color: MemberColor;
  /** The member's photo, or `null` for their initial. An anonymous viewer always receives `null`. */
  photo?: string | null;
  /** The viewer's own lane: tinted, with “· you” after the name. */
  you?: boolean;
  /** The first three lanes' gold, silver and bronze ring, on tablet and desktop only. */
  medal?: PictureMedal | null;
  /** The member's best share over the period, under the name on tablet and desktop, and in the opened lane on phone. `null` when they held no priced share. */
  best?: LaneBest | null;
  /**
   * What the lane shows: `{ board: "gain", gain, unit }` for the gain over
   * the period in the unit setting, or `{ board: "balance", balance }`. An
   * anonymous viewer has no euros: the gain reads in percent, and a `null`
   * balance draws nothing.
   */
  value: LaneValue;
  /**
   * The lowest and highest values across every lane of the standings, from
   * `laneScale`, so the zero line sits at the same place in each lane and the
   * bars compare. Without it, the lane is measured against itself.
   */
  scale?: LaneScale;
  /** The day the member's history starts when it is after the period's start: their gain is measured from it, and the lane says “since 12 Feb”. */
  measuredFrom?: IsoDate | null;
  /** A held share has no price yet: it is left out of the balance, and the lane says “Incomplete”. */
  incomplete?: boolean;
  /** The lane is open: on phone, it shows the best share under the row, then `children`. */
  open?: boolean;
  /** The lane's starting state when `open` isn't controlled. */
  defaultOpen?: boolean;
  /** Called when the lane is pressed, with the state it asks for. The standings focus the member with it. */
  onOpenChange?: (open: boolean) => void;
  /** What the opened lane shows under its row at every width, such as a link to the member's page. */
  children?: ReactNode;
}

export type LaneProps = LaneOwnProps &
  Omit<ComponentProps<"div">, keyof LaneOwnProps>;

/**
 * One member in the standings: their picture, name and best share, a bar from
 * the zero line, and their value. Gains go right of the zero line and losses
 * left; the order and the bars show the ranking, with no rank numbers. The
 * whole row is a button that opens the lane in place.
 */
export function Lane({
  name,
  color,
  photo = null,
  you = false,
  medal = null,
  best = null,
  value,
  scale,
  measuredFrom = null,
  incomplete = false,
  open,
  defaultOpen,
  onOpenChange,
  children,
  className,
  ...props
}: LaneProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const amount = laneAmount(value);
  const bar = laneBar(
    amount,
    scale ?? { min: Math.min(0, amount ?? 0), max: Math.max(0, amount ?? 0) },
  );
  const hasMarkers = incomplete || measuredFrom !== null;
  return (
    <Collapsible.Root
      {...props}
      {...(open === undefined ? {} : { open })}
      {...(defaultOpen === undefined ? {} : { defaultOpen })}
      {...(onOpenChange
        ? { onOpenChange: (next: boolean) => onOpenChange(next) }
        : {})}
      className={cn("rounded-m", you ? "bg-highlight" : "", className)}
    >
      <Collapsible.Trigger
        className={cn(
          "grid w-full cursor-pointer items-center rounded-m text-start text-primary",
          "grid-cols-[auto_minmax(0,1fr)_3.5rem_4.25rem] gap-[0.625rem] px-s py-[0.4375rem]",
          "tablet:grid-cols-[auto_11.25rem_minmax(0,1fr)_5.5rem] tablet:gap-[0.875rem] tablet:px-[0.75rem] tablet:py-s",
          "desktop:grid-cols-[auto_14.375rem_minmax(0,1fr)_5.5rem] desktop:gap-[0.875rem] desktop:px-[0.75rem] desktop:py-s",
          "focus-visible:focus-ring",
        )}
      >
        <Picture
          name={name}
          color={color}
          photo={photo}
          size="s"
          medal={medal}
          aria-hidden
        />
        <span className="flex min-w-0 flex-col">
          <span
            className={cn(
              "truncate font-semibold",
              "text-s",
              "tablet:text-m",
              "desktop:text-m",
            )}
          >
            {name}
            {you ? (
              <span className="font-normal text-secondary">
                {" "}
                {t("lane.you")}
              </span>
            ) : null}
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
          {hasMarkers ? (
            <span className="flex flex-wrap items-center gap-x-s gap-y-xs pt-xs">
              {measuredFrom === null ? null : (
                <span className="text-xs text-secondary">
                  {t("lane.since", {
                    date: formatDate(measuredFrom, language),
                  })}
                </span>
              )}
              {incomplete ? <Badge state="incomplete" /> : null}
            </span>
          ) : null}
        </span>
        <span aria-hidden className="relative h-[0.875rem]">
          <span
            className="absolute -inset-y-xs w-[0.0625rem] bg-muted"
            style={{ left: `${bar.zero}%` }}
          />
          {bar.width > 0 ? (
            <span
              className={cn("absolute inset-y-[0] rounded-full", BARS[color])}
              style={{ left: `${bar.start}%`, width: `${bar.width}%` }}
            />
          ) : null}
        </span>
        <span
          className={cn(
            "text-end",
            "text-s",
            "tablet:text-m",
            "desktop:text-m",
          )}
        >
          <LaneFigure value={value} language={language} />
        </span>
      </Collapsible.Trigger>
      <Collapsible.Panel
        className={cn(
          "flex flex-col items-start gap-s",
          "ps-[2.875rem] pe-s pb-m",
          "tablet:ps-[3.375rem] tablet:pe-[0.75rem] tablet:pb-m",
          "desktop:ps-[3.375rem] desktop:pe-[0.75rem] desktop:pb-m",
          // With nothing but the best share, the panel opens on phone only.
          children ? "" : "tablet:hidden desktop:hidden",
        )}
      >
        {best ? (
          <span
            className={cn(
              "items-center gap-s text-xs text-secondary",
              "flex",
              "tablet:hidden",
              "desktop:hidden",
            )}
          >
            <span>{t("lane.bestShare")}</span>
            <Chip gain={best.percent ?? undefined}>{best.share}</Chip>
          </span>
        ) : null}
        {children}
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

/** The lane's value: the signed gain in its colour, or the balance in whole euros. */
function LaneFigure({
  value,
  language,
}: {
  value: LaneValue;
  language: Language;
}) {
  if (value.board === "gain") {
    return (
      <GainValue
        gain={value.gain}
        unit={value.unit}
        precision="euros"
        className="whitespace-nowrap"
      />
    );
  }
  if (value.balance === null) {
    return null;
  }
  return (
    <span className="font-semibold whitespace-nowrap tabular-nums">
      {formatMoney(value.balance, language, { precision: "euros" })}
    </span>
  );
}

const listFormats = new Map<Language, Intl.ListFormat>();

function listFormat(language: Language): Intl.ListFormat {
  let format = listFormats.get(language);
  if (!format) {
    format = new Intl.ListFormat(language, { type: "conjunction" });
    listFormats.set(language, format);
  }
  return format;
}

export interface LaneNotStartedProps
  extends Omit<ComponentProps<"p">, "children"> {
  /** The names of the members with no entry yet. Renders nothing when empty. */
  names: readonly string[];
}

/** The members who haven't started, in one line under the lanes: “Kim and Lea haven’t started yet.” */
export function LaneNotStarted({
  names,
  className,
  ...props
}: LaneNotStartedProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  if (names.length === 0) {
    return null;
  }
  return (
    <p
      {...props}
      className={cn(
        "pt-s text-s text-secondary",
        "px-s",
        "tablet:px-[0.75rem]",
        "desktop:px-[0.75rem]",
        className,
      )}
    >
      {t("lane.notStarted", {
        count: names.length,
        names: listFormat(language).format(names),
      })}
    </p>
  );
}
