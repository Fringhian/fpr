import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";

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
