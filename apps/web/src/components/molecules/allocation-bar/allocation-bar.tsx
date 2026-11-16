import type { Decimal } from "@fpr/contracts";
import Big from "big.js";
import type { ComponentProps, CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { formatPercent } from "../../../lib/format/money";
import { useLanguage } from "../../../lib/i18n";
import { MEMBER_TONES, type MemberColor } from "../../../lib/member-color";
import {
  type AllocationHolding,
  type AllocationPart,
  allocate,
} from "./allocation-bar-model";

/** A share or Other in the person's colour, mixed with the surface by its tone; the cash in grey. */
function fill(part: AllocationPart): {
  className: string;
  style?: CSSProperties;
} {
  if (part.kind === "cash") return { className: "bg-muted" };
  return {
    className: "",
    style: {
      backgroundColor: `color-mix(in srgb, var(--tone) ${part.tone}%, var(--color-surface))`,
    },
  };
}

function partKey(part: AllocationPart): string {
  return part.kind === "share" ? `share-${part.id}` : part.kind;
}

function Track({ parts }: { parts: readonly AllocationPart[] }) {
  return (
    <div
      aria-hidden="true"
      className="flex h-[0.875rem] gap-[0.125rem] overflow-hidden rounded-full"
    >
      {parts.map((part) => {
        const { className: tone, style } = fill(part);
        return new Big(part.weight).gt(0) ? (
          <span
            key={partKey(part)}
            className={cn("basis-0", tone)}
            style={{ ...style, flexGrow: part.weight }}
          />
        ) : null;
      })}
    </div>
  );
}

function Key({ parts }: { parts: readonly AllocationPart[] }) {
  const { t } = useTranslation();
  const language = useLanguage();

  const name = (part: AllocationPart) => {
    switch (part.kind) {
      case "share":
        return part.name;
      case "other":
        return t("allocationBar.other");
      case "cash":
        return t("allocationBar.cash");
    }
  };

  return (
    <ul
      aria-label={t("allocationBar.label")}
      className="flex flex-wrap gap-x-m gap-y-[0.375rem] text-xs text-secondary"
    >
      {parts.map((part) => {
        const { className: tone, style } = fill(part);
        return (
          <li
            key={partKey(part)}
            className="inline-flex items-center gap-[0.375rem]"
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-[0.625rem] shrink-0 rounded-[0.1875rem]",
                tone,
              )}
              style={style}
            />
            <span>
              {name(part)}{" "}
              <span className="tabular-nums">
                {formatPercent(part.weight, language)}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export type AllocationBarProps = {
  /** The person's colour: the biggest share is drawn in it, each smaller one lighter. */
  color: MemberColor;
  /** The person's holdings, in any order, each with its weight in percent of the balance. A pending share, with a `null` weight, is left out. Past five shares, the rest fold into “Other”. */
  holdings: readonly AllocationHolding[];
  /** The cash's weight in percent of the balance, drawn in grey last, or `null` with no cash. */
  cashWeight: Decimal | null;
} & Omit<
  ComponentProps<"div">,
  "color" | "holdings" | "cashWeight" | "children"
>;

/**
 * How a portfolio splits between its shares and its cash: a bar in the
 * person's colour, darker for bigger weights, the cash in grey, and a key that
 * names each part with its percentage. It reads weights only, so it shows the
 * same to an anonymous viewer. With nothing to split, it renders nothing.
 *
 * Every other prop goes to its outer `<div>`, `className` included.
 */
export function AllocationBar({
  color,
  holdings,
  cashWeight,
  className,
  ...props
}: AllocationBarProps) {
  const parts = allocate(holdings, cashWeight);

  return parts.length === 0 ? null : (
    <div
      {...props}
      className={cn("grid gap-s", MEMBER_TONES[color], className)}
    >
      <Track parts={parts} />
      <Key parts={parts} />
    </div>
  );
}
