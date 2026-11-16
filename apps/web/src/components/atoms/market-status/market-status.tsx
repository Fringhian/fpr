import type { Timestamp } from "@fpr/contracts";
import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { formatDate, formatTime } from "../../../lib/format/date";
import { useLanguage } from "../../../lib/i18n";

export type MarketStatusProps = {
  /** `open` while today's prices refresh, with a green dot; `closed` after the close, with a grey one. */
  status: "open" | "closed";
  /** When the prices shown were taken: their time while open, the close's day once closed. */
  pricedAt: Timestamp;
  /** The time zone the time and day are read in. The browser's by default. */
  timeZone?: string | undefined;
} & Omit<
  ComponentProps<"span">,
  "status" | "pricedAt" | "timeZone" | "children"
>;

const dot = cva("size-s shrink-0 rounded-full", {
  variants: {
    status: { open: "bg-positive", closed: "bg-muted" },
  },
});

/**
 * Whether the markets are open, and how fresh the prices are: a dot, then the
 * words, which carry the state on their own. “Markets open · prices as of
 * 14:30”, “Markets closed · close of Thu 5 Mar”.
 */
export function MarketStatus({
  status,
  pricedAt,
  timeZone,
  className,
  ...props
}: MarketStatusProps) {
  const { t } = useTranslation();
  const language = useLanguage();

  const text =
    status === "open"
      ? t("smallParts.marketStatus.open", {
          time: formatTime(pricedAt, language, { timeZone }),
        })
      : t("smallParts.marketStatus.closed", {
          date: formatDate(pricedAt, language, { style: "weekday", timeZone }),
        });

  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center gap-[0.375rem] text-xs text-secondary",
        className,
      )}
    >
      <span aria-hidden="true" className={dot({ status })} />
      {text}
    </span>
  );
}
