import type { IsoDate } from "@fpr/contracts";
import type { IChartApi, MouseEventParams, Time } from "lightweight-charts";
import {
  type Dispatch,
  type KeyboardEvent,
  type RefObject,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import { type DrawnLine, seriesOn } from "./chart-lines";
import { chartDays, dayOf, dayToTime, stepIndex } from "./chart-model";
import type { ChartLine } from "./chart-types";

/** The point the crosshair is on, and what put it there. */
export interface Active {
  index: number;
  source: "pointer" | "keyboard";
  /** The crosshair's x, from the chart's left edge, in pixels. */
  x: number;
  /** Past the middle, the readout sits left of the crosshair. */
  flip: boolean;
}

/** Where the crosshair stands on a time: its x, and which side the readout takes. */
function place(chart: IChartApi, time: Time): Pick<Active, "x" | "flip"> {
  const left = chart.priceScale("left").width();
  const x = (chart.timeScale().timeToCoordinate(time) ?? 0) + left;
  return { x, flip: x > (left + chart.timeScale().width()) / 2 };
}

/** Puts the crosshair on a day's point, on the first line that has one, and says where it stands. */
function crosshairTo(
  chart: IChartApi,
  drawn: readonly DrawnLine[],
  day: IsoDate,
): Pick<Active, "x" | "flip"> {
  const time = dayToTime(day);
  const on = drawn.find(({ values }) => values.has(day));
  const series = on ? seriesOn(on, day) : null;
  const value = on?.values.get(day);
  if (series && value !== undefined) {
    chart.setCrosshairPosition(Number(value), time, series);
  }
  return place(chart, time);
}

/**
 * The pointer moves the crosshair, and the readout follows it. The chart
 * repeats its crosshair after every redraw (a resize, a font, new options)
 * with no source event: that repeat moves the readout to the new x but
 * keeps whose point it is, so a keyboard point stays announced.
 */
function usePointerReadout(
  chart: IChartApi | null,
  dayIndex: ReadonlyMap<IsoDate, number>,
  setActive: Dispatch<SetStateAction<Active | null>>,
): void {
  useEffect(() => {
    if (!chart) return;
    const onMove = ({ time, point, sourceEvent }: MouseEventParams<Time>) => {
      if (time === undefined || point === undefined) {
        setActive((current) =>
          current?.source === "pointer" ? null : current,
        );
        return;
      }
      if (sourceEvent === undefined) {
        setActive(
          (current) => current && { ...current, ...place(chart, time) },
        );
        return;
      }
      const index = dayIndex.get(dayOf(time));
      if (index === undefined) return;
      setActive({ index, source: "pointer", ...place(chart, time) });
    };
    chart.subscribeCrosshairMove(onMove);
    return () => chart.unsubscribeCrosshairMove(onMove);
  }, [chart, dayIndex, setActive]);
}

/**
 * The point the crosshair is on and its day, moved by the pointer or by the
 * keys: `move` takes the arrow keys, Home, End and Escape, and `leave`
 * clears a keyboard point when the chart loses focus.
 */
export function useActivePoint(
  chart: IChartApi | null,
  drawn: RefObject<DrawnLine[]>,
  lines: readonly ChartLine[],
) {
  const [active, setActive] = useState<Active | null>(null);
  const days = useMemo(() => chartDays(lines), [lines]);
  const dayIndex = useMemo(
    () => new Map(days.map((day, index) => [day, index])),
    [days],
  );
  usePointerReadout(chart, dayIndex, setActive);

  const day = active ? days[active.index] : undefined;

  function move(event: KeyboardEvent<HTMLDivElement>) {
    if (!chart) return;
    if (event.key === "Escape") {
      chart.clearCrosshairPosition();
      setActive(null);
      return;
    }
    const index = stepIndex(event.key, active?.index ?? null, days.length);
    const target = index === undefined ? undefined : days[index];
    if (index === undefined || target === undefined) return;
    event.preventDefault();
    const at = crosshairTo(chart, drawn.current, target);
    setActive({ index, source: "keyboard", ...at });
  }

  function leave() {
    if (active?.source !== "keyboard") return;
    chart?.clearCrosshairPosition();
    setActive(null);
  }

  return { active, day, move, leave };
}
