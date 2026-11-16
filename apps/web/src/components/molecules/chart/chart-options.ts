import {
  type ChartOptions,
  ColorType,
  CrosshairMode,
  type DeepPartial,
  type LineSeriesPartialOptions,
  LineStyle,
} from "lightweight-charts";
import { cssVariable } from "../../../lib/css-variable";
import type { ChartLine, ChartVariant } from "./chart-types";

const LINE_WIDTH = { focus: 2, context: 1 } as const;

/** A colour token's value, read where the chart sits so it follows the theme. */
export function token(element: Element, name: string): string {
  return cssVariable(`--color-${name}`, element);
}

function baseOptions(element: HTMLElement): DeepPartial<ChartOptions> {
  const style = getComputedStyle(element);
  return {
    autoSize: true,
    layout: {
      background: { type: ColorType.Solid, color: "transparent" },
      textColor: token(element, "secondary"),
      fontFamily: style.fontFamily,
      fontSize: Number.parseFloat(style.fontSize),
      // The logo would sit on the lines; How FPR works credits TradingView instead.
      attributionLogo: false,
    },
    // No panning, zooming or kinetic scroll: the chart shows its period, and nothing moves on its own.
    handleScroll: false,
    handleScale: false,
    kineticScroll: { mouse: false, touch: false },
  };
}

function lineOptions(element: HTMLElement): DeepPartial<ChartOptions> {
  return {
    ...baseOptions(element),
    grid: {
      vertLines: { visible: false },
      horzLines: { color: token(element, "divider"), style: LineStyle.Dashed },
    },
    leftPriceScale: {
      visible: true,
      borderVisible: false,
      // A label cut by the chart's top or bottom edge is left out.
      entireTextOnly: true,
      scaleMargins: { top: 0.15, bottom: 0.1 },
    },
    rightPriceScale: { visible: false },
    timeScale: {
      borderVisible: false,
      fixLeftEdge: true,
      fixRightEdge: true,
      lockVisibleTimeRangeOnResize: true,
    },
    crosshair: {
      mode: CrosshairMode.Magnet,
      vertLine: {
        color: token(element, "secondary"),
        width: 1,
        style: LineStyle.Dashed,
        labelVisible: false,
      },
      horzLine: { visible: false, labelVisible: false },
    },
  };
}

function sparklineOptions(element: HTMLElement): DeepPartial<ChartOptions> {
  return {
    ...baseOptions(element),
    grid: { vertLines: { visible: false }, horzLines: { visible: false } },
    leftPriceScale: { visible: false },
    rightPriceScale: {
      visible: false,
      scaleMargins: { top: 0.1, bottom: 0.1 },
    },
    timeScale: { visible: false, fixLeftEdge: true, fixRightEdge: true },
    crosshair: {
      mode: CrosshairMode.Hidden,
      vertLine: { visible: false, labelVisible: false },
      horzLine: { visible: false, labelVisible: false },
    },
  };
}

/** The chart's options for its variant, styled from the tokens. */
export function chartOptions(
  element: HTMLElement,
  variant: ChartVariant,
): DeepPartial<ChartOptions> {
  return variant === "line" ? lineOptions(element) : sparklineOptions(element);
}

/**
 * A line's series: its colour and width, dashed after its last final day, on
 * the left scale of a line chart. A line chart's lines in focus carry a
 * marker under the crosshair.
 */
export function seriesOptions(
  element: HTMLElement,
  line: ChartLine,
  dashed: boolean,
  variant: ChartVariant,
): LineSeriesPartialOptions {
  const emphasis = line.emphasis ?? "focus";
  const interactive = variant === "line";
  return {
    color: token(element, line.color),
    lineWidth: LINE_WIDTH[emphasis],
    lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid,
    priceScaleId: interactive ? "left" : "right",
    lastValueVisible: false,
    priceLineVisible: false,
    crosshairMarkerVisible: interactive && emphasis === "focus",
    crosshairMarkerRadius: 4,
    crosshairMarkerBorderColor: token(element, "surface"),
    crosshairMarkerBorderWidth: 2,
  };
}
