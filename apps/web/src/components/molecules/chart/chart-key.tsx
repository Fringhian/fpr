import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import type { ChartMark } from "./chart-types";

/**
 * A mark's arrow and what it stands for, “Purchase” or “Sale”, drawn as the
 * chart draws it. Every prop goes to the `<span>`, `children` its words.
 */
export function MarkKey({
  direction,
  className,
  children,
  ...props
}: Pick<ChartMark, "direction"> & ComponentProps<"span">) {
  const up = direction === "up";

  return (
    <span
      {...props}
      className={cn("inline-flex items-center gap-xs", className)}
    >
      <svg
        aria-hidden
        width="10"
        height="10"
        viewBox="0 0 10 10"
        className={up ? "fill-positive" : "fill-negative"}
      >
        <path d={up ? "M5 0 10 5H7v5H3V5H0Z" : "M5 10 0 5h3V0h4v5h3Z"} />
      </svg>
      {children}
    </span>
  );
}

/**
 * A short dashed stroke and its words, “Today, not final”: what the dashed
 * end of a chart's lines means. Every prop goes to the `<span>`.
 */
export function NotFinalKey({
  className,
  ...props
}: Omit<ComponentProps<"span">, "children">) {
  const { t } = useTranslation();

  return (
    <span
      {...props}
      className={cn(
        "ml-auto inline-flex items-center gap-xs text-xs text-secondary",
        className,
      )}
    >
      <svg
        aria-hidden
        width="16"
        height="2"
        className="stroke-secondary"
        viewBox="0 0 16 2"
      >
        <line
          x1="0"
          y1="1"
          x2="16"
          y2="1"
          strokeWidth={2}
          strokeDasharray="3 3"
        />
      </svg>
      {t("raceCard.notFinal")}
    </span>
  );
}
