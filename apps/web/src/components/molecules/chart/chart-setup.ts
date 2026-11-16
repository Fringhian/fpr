import {
  createChart,
  type IChartApi,
  TickMarkType,
  type Time,
} from "lightweight-charts";
import { type RefObject, useEffect, useState } from "react";
import { formatDate } from "../../../lib/format/date";
import { useLanguage } from "../../../lib/i18n";
import type { DrawnLine } from "./chart-lines";
import {
  type ChartValueFormat,
  dayOf,
  formatChartValue,
  toDecimal,
} from "./chart-model";
import { chartOptions } from "./chart-options";
import type { ChartVariant } from "./chart-types";

/** The canvas draws its text before the font loads: it draws again once the font has. */
function redrawOnFont(
  chart: IChartApi,
  container: RefObject<HTMLDivElement | null>,
  element: HTMLElement,
): void {
  void document.fonts?.ready.then(() => {
    if (container.current === element) {
      chart.applyOptions({
        layout: { fontFamily: getComputedStyle(element).fontFamily },
      });
    }
  });
}

/** Every period fills the width, whatever the container's. */
function useFitWidth(chart: IChartApi | null): void {
  useEffect(() => {
    if (!chart) return;
    const timeScale = chart.timeScale();
    const fit = () => timeScale.fitContent();
    timeScale.subscribeSizeChange(fit);
    return () => timeScale.unsubscribeSizeChange(fit);
  }, [chart]);
}

/**
 * The chart itself in `container`, created once per variant, fitted to its
 * width, and removed with the component, its drawn lines with it. `null`
 * until it is created.
 */
export function useChartApi(
  container: RefObject<HTMLDivElement | null>,
  drawn: RefObject<DrawnLine[]>,
  variant: ChartVariant,
): IChartApi | null {
  const [chart, setChart] = useState<IChartApi | null>(null);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const created = createChart(element, chartOptions(element, variant));
    setChart(created);
    redrawOnFont(created, container, element);
    return () => {
      created.remove();
      drawn.current = [];
      setChart(null);
    };
  }, [container, drawn, variant]);
  useFitWidth(chart);

  return chart;
}

/** The axes in the reader's language and the chart's format. */
export function useAxisFormat(
  chart: IChartApi | null,
  format: ChartValueFormat,
): void {
  const language = useLanguage();
  useEffect(() => {
    if (!chart) return;
    chart.applyOptions({
      localization: {
        priceFormatter: (price: number) =>
          formatChartValue(toDecimal(price), language, format),
        timeFormatter: (time: Time) =>
          formatDate(dayOf(time), language, { style: "weekday" }),
      },
      timeScale: {
        tickMarkFormatter: (time: Time, type: TickMarkType) =>
          formatDate(dayOf(time), language, {
            year: type === TickMarkType.Year,
          }),
      },
    });
  }, [chart, language, format]);
}
