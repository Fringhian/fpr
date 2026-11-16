import type { IsoDate } from "@fpr/contracts";
import {
  createSeriesMarkers,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import { dayToTime } from "./chart-model";
import { token } from "./chart-options";
import type { ChartLine, ChartMark } from "./chart-types";

// Lightweight Charts scales an arrow with the days' spacing; at 0.5 it stays a small sign beside the line.
const MARK_SIZE = 0.5;

// A mark shows on its own day when the line has a point then, else on the
// line's next point, else on its last.
function shownDay(days: readonly IsoDate[], day: IsoDate): IsoDate | undefined {
  return days.find((candidate) => candidate >= day) ?? days.at(-1);
}

/** A line's marks, each on the day it shows on, in the line's order. */
export function placedMarks(line: ChartLine): ChartMark[] {
  if (!line.marks?.length) return [];
  const days = line.points.map((point) => point.day).toSorted();
  return line.marks.flatMap((mark) => {
    const day = shownDay(days, mark.day);
    return day === undefined ? [] : [{ ...mark, day }];
  });
}

/** What the marks on a day say, for the readout, each once. */
export function markLabelsOn(
  lines: readonly ChartLine[],
  day: IsoDate,
): string[] {
  const labels = lines.flatMap((line) =>
    placedMarks(line)
      .filter((mark) => mark.day === day)
      .map((mark) => mark.label),
  );
  return [...new Set(labels)];
}

function arrows(
  element: Element,
  marks: readonly ChartMark[],
): SeriesMarker<Time>[] {
  const seen = new Set<string>();
  const byDay = marks.toSorted((a, b) => a.day.localeCompare(b.day));
  return byDay.flatMap((mark): SeriesMarker<Time>[] => {
    const key = `${mark.day} ${mark.direction} ${mark.color}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const up = mark.direction === "up";
    return [
      {
        time: dayToTime(mark.day),
        position: up ? "belowBar" : "aboveBar",
        shape: up ? "arrowUp" : "arrowDown",
        color: token(element, mark.color ?? (up ? "positive" : "negative")),
        size: MARK_SIZE,
      },
    ];
  });
}

/**
 * Draws a line's marks on the series that holds their days, the solid one up
 * to its last final day and the dashed one after. Returns the plugins, which
 * are detached before their series are removed.
 */
export function drawMarks(
  element: Element,
  line: ChartLine,
  series: {
    solid: ISeriesApi<"Line"> | null;
    dashed: ISeriesApi<"Line"> | null;
  },
): ISeriesMarkersPluginApi<Time>[] {
  const marks = placedMarks(line);
  if (marks.length === 0) return [];
  const after = (mark: ChartMark) =>
    line.dashedAfter !== undefined && mark.day > line.dashedAfter;
  const parts = [
    {
      on: series.solid ?? series.dashed,
      marks: marks.filter((m) => !after(m)),
    },
    { on: series.dashed ?? series.solid, marks: marks.filter(after) },
  ];
  return parts.flatMap(({ on, marks: part }) =>
    on && part.length > 0
      ? [createSeriesMarkers(on, arrows(element, part))]
      : [],
  );
}
