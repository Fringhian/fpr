import { Progress } from "@base-ui/react/progress";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn, stateClassName } from "../../../lib/cn";

/**
 * Every prop of Base UI's `Progress.Root`, `className` included, but the
 * value, its range and its text, which `step` and `count` set.
 */
export type StepProgressProps = {
  /** The step on screen, from 1: it and every step before it are filled. */
  step: number;
  /** How many steps the flow has, one segment each. */
  count: number;
} & Omit<
  ComponentProps<typeof Progress.Root>,
  "step" | "count" | "value" | "min" | "max" | "getAriaValueText" | "children"
>;

const segment = "h-xs flex-1 rounded-full";

/**
 * A thin bar of one segment per step, filled up to the step on screen, at
 * the top of a step flow, on Base UI's progress bar. It fills the width it is
 * given. Screen readers hear “Step 2 of 4”.
 */
export function StepProgress({
  step,
  count,
  className,
  ...props
}: StepProgressProps) {
  const { t } = useTranslation();

  const current = Math.min(Math.max(step, 0), count);
  const valueText = t("smallParts.stepProgress.value", {
    step: current,
    total: count,
  });

  return (
    <Progress.Root
      aria-label={t("smallParts.stepProgress.label")}
      {...props}
      value={current}
      min={0}
      max={count}
      getAriaValueText={() => valueText}
      className={stateClassName("flex w-full gap-xs", className)}
    >
      {Array.from({ length: count }, (_, index) => (
        <span
          // The segments never reorder: their place is their identity.
          // biome-ignore lint/suspicious/noArrayIndexKey: see above
          key={index}
          className={cn(segment, index < current ? "bg-primary" : "bg-muted")}
        />
      ))}
    </Progress.Root>
  );
}
