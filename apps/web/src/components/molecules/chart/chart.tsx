import { type ComponentProps, type ReactNode, useMemo, useRef } from "react";
import { cn } from "../../../lib/cn";
import type { MoneyPrecision } from "../../../lib/format";
import { type DrawnLine, useChartLines } from "./chart-lines";
import type { ChartUnit } from "./chart-model";
import { LinePlot } from "./chart-plot";
import { useAxisFormat, useChartApi } from "./chart-setup";
import type { ChartLayout, ChartLine, ChartVariant } from "./chart-types";

export type { ChartPoint, ChartUnit } from "./chart-model";
export type {
  ChartColor,
  ChartLayout,
  ChartLine,
  ChartLineEnd,
  ChartVariant,
} from "./chart-types";

/** The chart's own props, and every prop of the `<div>` it renders but its children: the chart draws its own. */
export type ChartProps = {
  /** `line`: axes, grid, crosshair and the keyboard. `sparkline`: the line alone, for cards, with no axes and no interaction. */
  variant?: ChartVariant;
  /** The lines, drawn in order. Pass a stable array: a new one redraws every line. */
  lines: readonly ChartLine[];
  /** Names the chart to screen readers: “World Index ETF, price this month”. */
  label: string;
  /** What the values are: amounts in euros, or percentages. */
  unit: ChartUnit;
  /** With `unit="money"`: `cents` (the default) for prices, `euros` for balances. */
  precision?: MoneyPrecision;
  /** A sign on every value but zero, for gains: `+4.2%`. */
  signed?: boolean;
  /** `line` only: drawn over the chart from where each line ends, and redrawn as it resizes, such as the race's pictures and signs. */
  overlay?: ((layout: ChartLayout) => ReactNode) | undefined;
  /** `line` only: called with a line's `id` when a click or a tap lands on it, or close to it. The pointer turns into a hand over a line. */
  onSelectLine?: ((id: string) => void) | undefined;
} & Omit<ComponentProps<"div">, "children">;

/** The chart's height by variant: 208px for a line chart, 34px for a sparkline. A `className` height wins. */
const HEIGHTS = {
  line: "h-[13rem]",
  sparkline: "h-[2.125rem]",
} as const satisfies Record<ChartVariant, string>;

const LINE_FRAME = "relative w-full min-w-0 font-sans text-xs text-secondary";

/**
 * A chart on TradingView Lightweight Charts, styled from the tokens, that
 * fills its container’s width and follows it as it resizes.
 *
 * The `line` variant shows its axes and a dashed grid; hovering draws a
 * crosshair and the readout of every line on that day, and the arrow keys
 * move it along the days with the same readout, read out to screen readers.
 * The `sparkline` variant is the line alone, for cards.
 *
 * Every other prop goes to the chart's outer `<div>`, `className` included:
 * its classes win any conflict, such as the chart's height.
 */
export function Chart({
  variant = "line",
  lines,
  label,
  unit,
  precision = "cents",
  signed = false,
  className,
  overlay,
  onSelectLine,
  ...props
}: ChartProps) {
  const container = useRef<HTMLDivElement>(null);
  const format = useMemo(
    () => ({ unit, precision, signed }),
    [unit, precision, signed],
  );
  const drawn = useRef<DrawnLine[]>([]);
  const chart = useChartApi(container, drawn, variant);
  useChartLines(chart, container, drawn, { lines, variant });
  useAxisFormat(chart, format);

  if (variant === "sparkline") {
    return (
      <div
        {...props}
        role="img"
        aria-label={label}
        className={cn("w-full min-w-0", HEIGHTS.sparkline, className)}
      >
        <div ref={container} className="size-full" />
      </div>
    );
  }

  return (
    <div {...props} className={cn(LINE_FRAME, HEIGHTS.line, className)}>
      <LinePlot
        chart={chart}
        container={container}
        drawn={drawn}
        lines={lines}
        label={label}
        format={format}
        overlay={overlay}
        onSelectLine={onSelectLine}
      />
    </div>
  );
}
