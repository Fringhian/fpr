import {
  type Decimal,
  formatMoney,
  formatPercent,
  type MoneyPrecision,
} from "./format";
import type { Language } from "./language";
import { MINUS } from "./typography";

/** How a gain is expressed: the shared unit setting, `€` or `%`. */
export type GainUnit = "eur" | "percent";

/**
 * A gain as the API sends it. `percent` is `null` from a start at zero. The
 * anonymizer removes `eur` for an anonymous viewer, who sees percent only.
 */
export interface GainInput {
  eur?: Decimal | null;
  percent: Decimal | null;
}

/** The direction a gain reads in, from its sign once rounded. */
export type GainTone = "positive" | "negative" | "flat";

export interface GainDisplay {
  /** The signed value: `+4.2%`, `−€18.30`, or `0.0%` with no sign. */
  text: string;
  tone: GainTone;
  /** The unit the value is written in, which may differ from the one asked. */
  unit: GainUnit;
}

/**
 * A gain in the unit asked for, signed, with its tone. Without euros (an
 * anonymous viewer) it reads in percent; without a percentage (a start at
 * zero) in euros; with neither, `null`.
 */
export function gainDisplay(
  gain: GainInput,
  unit: GainUnit,
  language: Language,
  { precision = "cents" }: { precision?: MoneyPrecision | undefined } = {},
): GainDisplay | null {
  const eur = gain.eur ?? null;
  const inEuros = (amount: Decimal): GainDisplay =>
    display(formatMoney(amount, language, { precision, signed: true }), "eur");
  if (unit === "eur" && eur !== null) {
    return inEuros(eur);
  }
  if (gain.percent !== null) {
    return display(
      formatPercent(gain.percent, language, { signed: true }),
      "percent",
    );
  }
  return eur === null ? null : inEuros(eur);
}

function display(text: string, unit: GainUnit): GainDisplay {
  return { text, tone: toneOf(text), unit };
}

/** The tone of a signed value, read from its sign once rounded. */
function toneOf(text: string): GainTone {
  if (text.startsWith("+")) {
    return "positive";
  }
  return text.startsWith(MINUS) ? "negative" : "flat";
}
