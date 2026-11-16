import type { IChartApi, MouseEventParams, Time } from "lightweight-charts";
import { type RefObject, useEffect, useEffectEvent, useState } from "react";
import { type DrawnLine, seriesOn } from "./chart-lines";
import { dayOf, dayToTime, lastPoint, nearestLine } from "./chart-model";
import type { ChartLayout, ChartLine, ChartLineEnd } from "./chart-types";

/** How far from a line, in pixels, a click still selects it. */
const SELECT_REACH = 12;

const NO_LAYOUT: ChartLayout = { ends: [], height: 0 };

/** Where each drawn line ends, measured on the chart as it is now. */
function measure(chart: IChartApi, drawn: readonly DrawnLine[]): ChartLayout {
  const left = chart.priceScale("left").width();
  const ends = drawn.flatMap((part): ChartLineEnd[] => {
    const last = lastPoint(part.line);
    const series = last ? seriesOn(part, last.day) : null;
    if (!last || !series) return [];
    const x = chart.timeScale().timeToCoordinate(dayToTime(last.day));
    const y = series.priceToCoordinate(Number(last.value));
    if (x === null || y === null) return [];
    return [{ id: part.line.id, x: x + left, y }];
  });
  return { ends, height: chart.paneSize().height };
}

/** The line under the pointer, if one is within reach; the one on top wins a tie. */
function lineAt(
  drawn: readonly DrawnLine[],
  event: MouseEventParams<Time>,
): string | undefined {
  if (event.time === undefined || event.point === undefined) return undefined;
  const day = dayOf(event.time);
  const heights = drawn.flatMap((part) => {
    const value = part.values.get(day);
    const y =
      value === undefined
        ? null
        : seriesOn(part, day)?.priceToCoordinate(Number(value));
    return y === null || y === undefined ? [] : [{ id: part.line.id, y }];
  });
  return nearestLine(heights.toReversed(), event.point.y, SELECT_REACH);
}

/**
 * Where the lines end, for an overlay: measured once the chart has drawn,
 * and again as it resizes. The ends stay where they were until measured
 * again, so the overlay never blinks.
 */
export function useLineEnds(
  chart: IChartApi | null,
  container: RefObject<HTMLDivElement | null>,
  drawn: RefObject<DrawnLine[]>,
  lines: readonly ChartLine[],
  enabled: boolean,
): ChartLayout {
  const [layout, setLayout] = useState<ChartLayout>(NO_LAYOUT);
  // biome-ignore lint/correctness/useExhaustiveDependencies: new lines are redrawn, so their ends are measured again.
  useEffect(() => {
    const element = container.current;
    if (!chart || !element || !enabled) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setLayout(measure(chart, drawn.current)),
      );
    };
    update();
    const timeScale = chart.timeScale();
    timeScale.subscribeSizeChange(update);
    const resized = new ResizeObserver(update);
    resized.observe(element);
    void document.fonts?.ready.then(update);
    return () => {
      cancelAnimationFrame(frame);
      timeScale.unsubscribeSizeChange(update);
      resized.disconnect();
    };
  }, [chart, container, drawn, lines, enabled]);

  return layout;
}

/** With `onSelect`, a click or a tap on a line, or close to it, selects it; the pointer shows which lines it can. */
export function useLineSelect(
  chart: IChartApi | null,
  container: RefObject<HTMLDivElement | null>,
  drawn: RefObject<DrawnLine[]>,
  onSelect: ((id: string) => void) | undefined,
): void {
  const enabled = onSelect !== undefined;
  const select = useEffectEvent((id: string) => onSelect?.(id));
  useEffect(() => {
    const element = container.current;
    if (!chart || !element || !enabled) return;
    const onClick = (event: MouseEventParams<Time>) => {
      const id = lineAt(drawn.current, event);
      if (id !== undefined) select(id);
    };
    const onMove = (event: MouseEventParams<Time>) => {
      element.style.cursor =
        lineAt(drawn.current, event) === undefined ? "" : "pointer";
    };
    chart.subscribeClick(onClick);
    chart.subscribeCrosshairMove(onMove);
    return () => {
      chart.unsubscribeClick(onClick);
      chart.unsubscribeCrosshairMove(onMove);
      element.style.cursor = "";
    };
  }, [chart, container, drawn, enabled]);
}
