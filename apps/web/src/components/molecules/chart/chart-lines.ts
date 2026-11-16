import type { Decimal, IsoDate } from "@fpr/contracts";
import {
  type IChartApi,
  type ISeriesApi,
  LineSeries,
  type LineSeriesPartialOptions,
} from "lightweight-charts";
import { type RefObject, useEffect } from "react";
import { type ChartPoint, dayToTime, splitLine } from "./chart-model";
import { seriesOptions } from "./chart-options";
import type { ChartLine, ChartVariant } from "./chart-types";

/** A line's drawn parts: the solid series, and the dashed one after its last final day. */
export interface DrawnLine {
  line: ChartLine;
  values: Map<IsoDate, Decimal>;
  solid: ISeriesApi<"Line"> | null;
  dashed: ISeriesApi<"Line"> | null;
}

/** The series a line is drawn with on a day: the dashed one after its last final day. */
export function seriesOn({ line, solid, dashed }: DrawnLine, day: IsoDate) {
  const after = line.dashedAfter !== undefined && day > line.dashedAfter;
  return (after ? dashed : solid) ?? solid ?? dashed;
}

function addPart(
  chart: IChartApi,
  part: readonly ChartPoint[],
  options: LineSeriesPartialOptions,
): ISeriesApi<"Line"> | null {
  if (part.length === 0) return null;
  const series = chart.addSeries(LineSeries, options);
  series.setData(
    part.map((point) => ({
      time: dayToTime(point.day),
      value: Number(point.value),
    })),
  );
  return series;
}

function drawLine(
  chart: IChartApi,
  element: HTMLElement,
  line: ChartLine,
  variant: ChartVariant,
): DrawnLine {
  const { solid, dashed } = splitLine(line);
  return {
    line,
    values: new Map(line.points.map((point) => [point.day, point.value])),
    solid: addPart(chart, solid, seriesOptions(element, line, false, variant)),
    dashed: addPart(chart, dashed, seriesOptions(element, line, true, variant)),
  };
}

/**
 * The lines, kept in `drawn`: one solid series each, and a dashed one after
 * its last final day, fitted to the width. They are drawn again when
 * `lines` changes. A removed chart takes its series with it, so
 * `useChartApi` empties `drawn` before this cleanup runs.
 */
export function useChartLines(
  chart: IChartApi | null,
  container: RefObject<HTMLDivElement | null>,
  drawn: RefObject<DrawnLine[]>,
  { lines, variant }: { lines: readonly ChartLine[]; variant: ChartVariant },
): void {
  useEffect(() => {
    const element = container.current;
    if (!chart || !element) return;
    drawn.current = lines.map((line) =>
      drawLine(chart, element, line, variant),
    );
    chart.timeScale().fitContent();
    return () => {
      for (const { solid, dashed } of drawn.current) {
        if (solid) chart.removeSeries(solid);
        if (dashed) chart.removeSeries(dashed);
      }
      drawn.current = [];
    };
  }, [chart, container, drawn, lines, variant]);
}
