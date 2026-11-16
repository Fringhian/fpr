import type { IChartApi } from "lightweight-charts";
import { type ReactNode, type RefObject, useId } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { useActivePoint } from "./chart-active";
import type { DrawnLine } from "./chart-lines";
import type { ChartValueFormat } from "./chart-model";
import { useLineEnds, useLineSelect } from "./chart-overlay";
import { ReadoutBox, useReadout } from "./chart-readout";
import type { ChartLayout, ChartLine } from "./chart-types";

interface LinePlotProps {
  chart: IChartApi | null;
  container: RefObject<HTMLDivElement | null>;
  drawn: RefObject<DrawnLine[]>;
  lines: readonly ChartLine[];
  label: string;
  format: ChartValueFormat;
  overlay: ((layout: ChartLayout) => ReactNode) | undefined;
  onSelectLine: ((id: string) => void) | undefined;
}

const AREA = cn("size-full rounded-s", "", "", "", "focus-visible:focus-ring");

/**
 * The line chart's interactive plot: the focusable area the chart draws in,
 * the overlay at the lines' ends, the readout beside the crosshair, and what
 * the keys do and say to screen readers.
 */
export function LinePlot({
  chart,
  container,
  drawn,
  lines,
  label,
  format,
  overlay,
  onSelectLine,
}: LinePlotProps) {
  const { t } = useTranslation();
  const hintId = useId();
  const { active, day, move, leave } = useActivePoint(chart, drawn, lines);
  const keyboard = active?.source === "keyboard";
  const { readout, announcement } = useReadout(day, keyboard, lines, format);
  const layout = useLineEnds(chart, container, drawn, lines, Boolean(overlay));
  useLineSelect(chart, container, drawn, onSelectLine);

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: a chart is no fieldset; the group names it and holds its keyboard. */}
      <div
        ref={container}
        role="group"
        aria-label={label}
        aria-describedby={hintId}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the arrow keys move along the chart's points.
        tabIndex={0}
        onKeyDown={move}
        onBlur={leave}
        className={AREA}
      />
      {overlay ? overlay(layout) : null}
      {readout && active ? (
        <ReadoutBox
          active={active}
          readout={readout}
          several={lines.length > 1}
        />
      ) : null}
      <p id={hintId} className="sr-only">
        {t("chart.keys")}
      </p>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
