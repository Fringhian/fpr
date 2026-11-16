import type { Decimal, IsoDate } from "@fpr/contracts";
import {
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  LineSeries,
  type LineSeriesPartialOptions,
  type Time,
} from "lightweight-charts";
import { type RefObject, useEffect } from "react";
import { drawMarks } from "./chart-marks";
import { type ChartPoint, dayToTime, splitLine } from "./chart-model";
import { seriesOptions } from "./chart-options";
import type { ChartLine, ChartVariant } from "./chart-types";

/** A line's drawn parts: the solid series, the dashed one after its last final day, and its marks. */
export interface DrawnLine {
  line: ChartLine;
  values: Map<IsoDate, Decimal>;
  solid: ISeriesApi<"Line"> | null;
  dashed: ISeriesApi<"Line"> | null;
  marks: ISeriesMarkersPluginApi<Time>[];
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
  const parts = splitLine(line);
  const series = {
    solid: addPart(
      chart,
      parts.solid,
      seriesOptions(element, line, false, variant),
    ),
    dashed: addPart(
      chart,
      parts.dashed,
      seriesOptions(element, line, true, variant),
    ),
  };
  return {
    line,
    values: new Map(line.points.map((point) => [point.day, point.value])),
    ...series,
    marks: variant === "line" ? drawMarks(element, line, series) : [],
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
      for (const { solid, dashed, marks } of drawn.current) {
        for (const plugin of marks) plugin.detach();
        if (solid) chart.removeSeries(solid);
        if (dashed) chart.removeSeries(dashed);
      }
      drawn.current = [];
    };
  }, [chart, container, drawn, lines, variant]);
}
