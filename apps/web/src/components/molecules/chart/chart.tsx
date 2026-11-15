import {
  type ChartOptions,
  ColorType,
  CrosshairMode,
  createChart,
  type DeepPartial,
  type IChartApi,
  type ISeriesApi,
  LineSeries,
  type LineSeriesPartialOptions,
  LineStyle,
  type MouseEventParams,
  TickMarkType,
  type Time,
} from "lightweight-charts";
import {
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import {
  type Decimal,
  formatDate,
  type IsoDate,
  type MoneyPrecision,
} from "../../../lib/format";
import { useLanguage } from "../../../lib/i18n";
import type { Language } from "../../../lib/language";
import {
  type ChartPoint,
  type ChartUnit,
  type ChartValueFormat,
  chartDays,
  dayToTime,
  formatChartValue,
  lastPoint,
  nearestLine,
  splitLine,
  stepIndex,
  timeToDay,
  toDecimal,
} from "./chart-model";

export type { ChartPoint, ChartUnit } from "./chart-model";

/**
 * The colours a line can take, each a colour token of `theme.css`, with the
 * class of its swatch in the readout. Listing the classes here also keeps
 * every token's CSS variable in the build, where the chart reads it.
 */
const SWATCHES = {
  primary: "bg-primary",
  positive: "bg-positive",
  negative: "bg-negative",
  muted: "bg-muted",
  vermilion: "bg-vermilion",
  cobalt: "bg-cobalt",
  green: "bg-green",
  violet: "bg-violet",
  amber: "bg-amber",
  pink: "bg-pink",
  cyan: "bg-cyan",
  lime: "bg-lime",
  sienna: "bg-sienna",
  periwinkle: "bg-periwinkle",
} as const satisfies Record<string, `bg-${string}`>;

/** A line's colour: `primary` for a chart's one line, `positive` or `negative` for a sparkline, `muted` for the context lines, or a member colour. */
export type ChartColor = keyof typeof SWATCHES;

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

export interface ChartOwnProps {
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
}

/** The chart's own props, and every prop of the `<div>` it renders but its children: the chart draws its own. */
export type ChartProps = ChartOwnProps &
  Omit<ComponentProps<"div">, keyof ChartOwnProps | "children">;

/** The chart's height by variant: 208px for a line chart, 34px for a sparkline. A `className` height wins. */
const HEIGHTS = {
  line: "h-[13rem]",
  sparkline: "h-[2.125rem]",
} as const satisfies Record<ChartVariant, string>;

const LINE_WIDTH = { focus: 2, context: 1 } as const;

/** How far from a line, in pixels, a click still selects it. */
const SELECT_REACH = 12;

const NO_LAYOUT: ChartLayout = { ends: [], height: 0 };

/** A time the chart hands back, as its day. */
function dayOf(time: Time): IsoDate {
  if (typeof time === "number") return timeToDay(time);
  if (typeof time === "string") return time;
  const month = String(time.month).padStart(2, "0");
  const day = String(time.day).padStart(2, "0");
  return `${time.year}-${month}-${day}`;
}

/** A colour token's value, read where the chart sits so it follows the theme. */
function token(element: Element, name: string): string {
  return getComputedStyle(element).getPropertyValue(`--color-${name}`).trim();
}

/** The options both variants share, styled from the tokens. */
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
  const muted = token(element, "secondary");
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
        color: muted,
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

/** A line's drawn parts: the solid series, and the dashed one after its last final day. */
interface DrawnLine {
  line: ChartLine;
  values: Map<IsoDate, Decimal>;
  solid: ISeriesApi<"Line"> | null;
  dashed: ISeriesApi<"Line"> | null;
}

/** The point the crosshair is on, and what put it there. */
interface Active {
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

/** The series a line is drawn with on a day: the dashed one after its last final day. */
function seriesOn({ line, solid, dashed }: DrawnLine, day: IsoDate) {
  const after = line.dashedAfter !== undefined && day > line.dashedAfter;
  return (after ? dashed : solid) ?? solid ?? dashed;
}

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
 * again, so the overlay never blinks. Call it after the lines are drawn.
 */
function useLineEnds(
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

/** A click or a tap on a line, or close to it, selects it; the pointer shows which lines it can. */
function useLineSelect(
  chart: IChartApi | null,
  container: RefObject<HTMLDivElement | null>,
  drawn: RefObject<DrawnLine[]>,
  enabled: boolean,
  onSelect: ((id: string) => void) | undefined,
): void {
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

/** What the readout shows on a day: the date, each line's value that day, and whether every value is final. */
interface Readout {
  date: string;
  final: boolean;
  values: { line: ChartLine; text: string }[];
}

function readoutOn(
  day: IsoDate,
  lines: readonly ChartLine[],
  language: Language,
  format: ChartValueFormat,
): Readout {
  const values = lines.flatMap((line) => {
    const value = line.points.find((point) => point.day === day)?.value;
    if (value === undefined) return [];
    return [
      {
        line,
        text: formatChartValue(value, language, format),
        final: line.dashedAfter === undefined || day <= line.dashedAfter,
      },
    ];
  });
  return {
    date: formatDate(day, language, { style: "weekday" }),
    final: values.every((value) => value.final),
    values,
  };
}

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
  const { t } = useTranslation();
  const language = useLanguage();
  const hintId = useId();
  const container = useRef<HTMLDivElement>(null);
  const drawn = useRef<DrawnLine[]>([]);
  const [chart, setChart] = useState<IChartApi | null>(null);
  const [active, setActive] = useState<Active | null>(null);
  const days = useMemo(() => chartDays(lines), [lines]);
  const dayIndex = useMemo(
    () => new Map(days.map((day, index) => [day, index])),
    [days],
  );
  // The chart itself, created once per variant and removed with the component.
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const created = createChart(
      element,
      variant === "line" ? lineOptions(element) : sparklineOptions(element),
    );
    setChart(created);
    // The canvas draws its text before the font loads: redraw once it has.
    void document.fonts?.ready.then(() => {
      if (container.current === element) {
        created.applyOptions({
          layout: { fontFamily: getComputedStyle(element).fontFamily },
        });
      }
    });
    return () => {
      created.remove();
      drawn.current = [];
      setChart(null);
      setActive(null);
    };
  }, [variant]);
  // The lines: one solid series each, and a dashed one after its last final day.
  useEffect(() => {
    const element = container.current;
    if (!chart || !element) return;
    const interactive = variant === "line";
    const priceScaleId = interactive ? "left" : "right";
    const surface = token(element, "surface");
    const series = (
      line: ChartLine,
      part: readonly ChartPoint[],
      dashed: boolean,
    ) => {
      if (part.length === 0) return null;
      const emphasis = line.emphasis ?? "focus";
      const options: LineSeriesPartialOptions = {
        color: token(element, line.color),
        lineWidth: LINE_WIDTH[emphasis],
        lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid,
        priceScaleId,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: interactive && emphasis === "focus",
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: surface,
        crosshairMarkerBorderWidth: 2,
      };
      const created = chart.addSeries(LineSeries, options);
      created.setData(
        part.map((point) => ({
          time: dayToTime(point.day),
          value: Number(point.value),
        })),
      );
      return created;
    };
    drawn.current = lines.map((line) => {
      const { solid, dashed } = splitLine(line);
      return {
        line,
        values: new Map(line.points.map((point) => [point.day, point.value])),
        solid: series(line, solid, false),
        dashed: series(line, dashed, true),
      };
    });
    chart.timeScale().fitContent();
    return () => {
      for (const { solid, dashed } of drawn.current) {
        if (solid) chart.removeSeries(solid);
        if (dashed) chart.removeSeries(dashed);
      }
      drawn.current = [];
    };
  }, [chart, lines, variant]);
  // Every period fills the width, whatever the container's.
  useEffect(() => {
    if (!chart) return;
    const timeScale = chart.timeScale();
    const fit = () => timeScale.fitContent();
    timeScale.subscribeSizeChange(fit);
    return () => timeScale.unsubscribeSizeChange(fit);
  }, [chart]);
  // Where the lines end, for the overlay, once they are drawn.
  const layout = useLineEnds(
    chart,
    container,
    drawn,
    lines,
    variant === "line" && overlay !== undefined,
  );
  // A click or a tap on a line selects it.
  useLineSelect(
    chart,
    container,
    drawn,
    variant === "line" && onSelectLine !== undefined,
    onSelectLine,
  );
  // The axes in the reader's language and the chart's unit.
  useEffect(() => {
    if (!chart) return;
    const format = { unit, precision, signed };
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
  }, [chart, language, unit, precision, signed]);
  // The pointer moves the crosshair; the readout follows it.
  useEffect(() => {
    if (!chart || variant !== "line") return;
    const onMove = (event: MouseEventParams<Time>) => {
      if (event.time === undefined || event.point === undefined) {
        setActive((current) =>
          current?.source === "pointer" ? null : current,
        );
        return;
      }
      const index = dayIndex.get(dayOf(event.time));
      if (index === undefined) return;
      setActive({ index, source: "pointer", ...place(chart, event.time) });
    };
    chart.subscribeCrosshairMove(onMove);
    return () => chart.unsubscribeCrosshairMove(onMove);
  }, [chart, variant, dayIndex]);

  const interactive = variant === "line";
  const several = lines.length > 1;
  const day = active ? days[active.index] : undefined;
  const readout =
    day === undefined
      ? null
      : readoutOn(day, lines, language, { unit, precision, signed });
  const date =
    readout === null || readout.final
      ? readout?.date
      : t("chart.notFinal", { date: readout.date });
  const announcement =
    readout && active?.source === "keyboard"
      ? t("chart.point", {
          date,
          values: readout.values
            .map(({ line, text }) =>
              several
                ? t("chart.lineValue", { label: line.label, value: text })
                : text,
            )
            .join(", "),
        })
      : "";

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
    const time = dayToTime(target);
    const on = drawn.current.find(({ values }) => values.has(target));
    const series =
      on?.line.dashedAfter !== undefined && target > on.line.dashedAfter
        ? on.dashed
        : on?.solid;
    const value = on?.values.get(target);
    if (series && value !== undefined) {
      chart.setCrosshairPosition(Number(value), time, series);
    }
    setActive({ index, source: "keyboard", ...place(chart, time) });
  }

  function leave() {
    if (active?.source !== "keyboard") return;
    chart?.clearCrosshairPosition();
    setActive(null);
  }

  if (!interactive) {
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
    <div
      {...props}
      className={cn(
        "relative w-full min-w-0 font-sans text-xs text-secondary",
        HEIGHTS.line,
        className,
      )}
    >
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
        className={cn(
          "size-full rounded-s",
          "",
          "",
          "",
          "focus-visible:focus-ring",
        )}
      />
      {overlay ? overlay(layout) : null}
      {readout && active ? (
        <div
          aria-hidden="true"
          style={{
            transform: active.flip
              ? `translateX(calc(${active.x}px - 100% - var(--spacing-s)))`
              : `translateX(calc(${active.x}px + var(--spacing-s)))`,
          }}
          className={cn(
            "pointer-events-none absolute top-0 left-0 z-10 grid gap-xs rounded-s border border-divider bg-surface px-s py-xs shadow-float",
            "",
            "",
            "",
            "motion-safe:transition-transform",
          )}
        >
          <span className="whitespace-nowrap">{date}</span>
          {readout.values.map(({ line, text }) => (
            <span
              key={line.id}
              className="flex items-center gap-s whitespace-nowrap text-s text-primary"
            >
              {several ? (
                <>
                  <span
                    className={cn(
                      "size-s shrink-0 rounded-full",
                      SWATCHES[line.color],
                    )}
                  />
                  <span className="grow">{line.label}</span>
                </>
              ) : null}
              <span className="font-semibold tabular-nums">{text}</span>
            </span>
          ))}
        </div>
      ) : null}
      <p id={hintId} className="sr-only">
        {t("chart.keys")}
      </p>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
