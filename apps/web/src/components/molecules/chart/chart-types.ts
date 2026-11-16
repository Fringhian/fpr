import type { IsoDate } from "@fpr/contracts";
import type { MemberColor } from "../../../lib/member-color";
import type { ChartPoint } from "./chart-model";

/** A line's colour: `primary` for a chart's one line, `positive` or `negative` for a sparkline, `muted` for the context lines, or a member colour. */
export type ChartColor =
  | "primary"
  | "positive"
  | "negative"
  | "muted"
  | MemberColor;

/**
 * Something that happened on a line's day, such as a purchase: an arrow on
 * the line, up under it or down over it, in the positive or negative colour.
 * A mark on a day the line has no point on moves to its next point, the day
 * it first shows in the line, or to its last point.
 */
export interface ChartMark {
  day: IsoDate;
  direction: "up" | "down";
  /** What happened, in the readout of its day and to screen readers: “Bought 10 World Index ETF”. */
  label: string;
}

/** One line of the chart. Lines draw in their order: the last one on top. */
export interface ChartLine {
  /** Tells the lines apart, such as the member's id. Unique within the chart. */
  id: string;
  /** Names the line in the readout and to screen readers: a member, a share. */
  label: string;
  /** A colour token. Identity never rests on colour alone: the label, a picture or a sign names the line too. */
  color: ChartColor;
  /** Its values, one per day at most. */
  points: readonly ChartPoint[];
  /** The last final day: the points after it are drawn dashed and read “not final”. */
  dashedAfter?: IsoDate;
  /** `focus` (the default) draws a 2px line with a marker under the crosshair; `context` a 1px line behind the ones in focus. */
  emphasis?: "focus" | "context";
  /** `line` only: arrows on the line's days, such as purchases up and sales down. */
  marks?: readonly ChartMark[] | undefined;
}

export type ChartVariant = "line" | "sparkline";

/** Where a line ends: its latest point, in pixels from the chart's top left corner. */
export interface ChartLineEnd {
  id: string;
  x: number;
  y: number;
}

/** Where the lines end, and the height of the area they are drawn in, above the days. */
export interface ChartLayout {
  ends: readonly ChartLineEnd[];
  height: number;
}
