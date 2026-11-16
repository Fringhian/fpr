import type { IsoDate, Language } from "@fpr/contracts";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { formatDate } from "../../../lib/format/date";
import { useLanguage } from "../../../lib/i18n";
import { MEMBER_FILLS } from "../../../lib/member-color";
import type { Active } from "./chart-active";
import { type ChartValueFormat, formatChartValue } from "./chart-model";
import type { ChartColor, ChartLine } from "./chart-types";

/**
 * The swatch of each line colour in the readout. Listing the classes here
 * also keeps every colour token's CSS variable in the build, where the chart
 * reads it.
 */
const SWATCHES = {
  primary: "bg-primary",
  positive: "bg-positive",
  negative: "bg-negative",
  muted: "bg-muted",
  ...MEMBER_FILLS,
} as const satisfies Record<ChartColor, `bg-${string}`>;

/** The readout's box: it slides along with the crosshair, and jumps with reduced motion. */
const BOX = cn(
  "pointer-events-none absolute top-0 left-0 z-10 grid gap-xs rounded-s border border-divider bg-surface px-s py-xs shadow-float",
  "",
  "",
  "",
  "motion-safe:transition-transform motion-safe:duration-s motion-safe:ease-soft",
);

/** What the readout shows on a day: the date, marked when a value is not final, and each line's value that day. */
export interface Readout {
  date: string;
  values: { line: ChartLine; text: string }[];
}

function readoutOn(
  day: IsoDate,
  lines: readonly ChartLine[],
  language: Language,
  format: ChartValueFormat,
): Readout & { final: boolean } {
  const values = lines.flatMap((line) => {
    const value = line.points.find((point) => point.day === day)?.value;
    if (value === undefined) return [];
    const text = formatChartValue(value, language, format);
    const final = line.dashedAfter === undefined || day <= line.dashedAfter;
    return [{ line, text, final }];
  });
  return {
    date: formatDate(day, language, { style: "weekday" }),
    final: values.every((value) => value.final),
    values,
  };
}

/**
 * The readout of the crosshair's day, its date marked “not final” when a
 * value is, and the sentence a keyboard point announces. Each line is named
 * when there are several.
 */
export function useReadout(
  day: IsoDate | undefined,
  keyboard: boolean,
  lines: readonly ChartLine[],
  format: ChartValueFormat,
): { readout: Readout | null; announcement: string } {
  const { t } = useTranslation();
  const language = useLanguage();

  if (day === undefined) return { readout: null, announcement: "" };
  const { final, date, values } = readoutOn(day, lines, language, format);
  const shown = final ? date : t("chart.notFinal", { date });
  const said = values.map(({ line, text }) =>
    lines.length > 1
      ? t("chart.lineValue", { label: line.label, value: text })
      : text,
  );
  const announcement = keyboard
    ? t("chart.point", { date: shown, values: said.join(", ") })
    : "";
  return { readout: { date: shown, values }, announcement };
}

/** The readout beside the crosshair: the date, then each line's value, with its swatch and name when there are several. */
export function ReadoutBox({
  active,
  readout,
  several,
}: {
  active: Active;
  readout: Readout;
  several: boolean;
}) {
  const transform = active.flip
    ? `translateX(calc(${active.x}px - 100% - var(--spacing-s)))`
    : `translateX(calc(${active.x}px + var(--spacing-s)))`;

  return (
    <div aria-hidden="true" style={{ transform }} className={BOX}>
      <span className="whitespace-nowrap">{readout.date}</span>
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
  );
}
