import { Progress } from "@base-ui/react/progress";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";

export interface StepProgressOwnProps {
  /** The step on screen, from 1: it and every step before it are filled. */
  step: number;
  /** How many steps the flow has, one segment each. */
  count: number;
  className?: string;
}

export type StepProgressProps = StepProgressOwnProps &
  Omit<
    Progress.Root.Props,
    | keyof StepProgressOwnProps
    | "value"
    | "min"
    | "max"
    | "format"
    | "locale"
    | "getAriaValueText"
    | "children"
  >;

/**
 * A thin bar of one segment per step, filled up to the step on screen, at
 * the top of a step flow. It fills the width it is given. Screen readers hear
 * “Step 2 of 4”.
 */
export function StepProgress({
  step,
  count,
  className,
  ...props
}: StepProgressProps) {
  const { t } = useTranslation();
  const current = Math.min(Math.max(step, 0), count);
  return (
    <Progress.Root
      aria-label={t("smallParts.stepProgress.label")}
      {...props}
      value={current}
      min={0}
      max={count}
      getAriaValueText={() =>
        t("smallParts.stepProgress.value", { step: current, total: count })
      }
      className={cn("flex w-full gap-xs", className)}
    >
      {Array.from({ length: count }, (_, index) => (
        <span
          // The segments never reorder: their place is their identity.
          // biome-ignore lint/suspicious/noArrayIndexKey: see above
          key={index}
          className={cn(
            "h-xs flex-1 rounded-full",
            index < current ? "bg-primary" : "bg-muted",
          )}
        />
      ))}
    </Progress.Root>
  );
}
