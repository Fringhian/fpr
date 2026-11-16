import type { Decimal, Language, Unit } from "@fpr/contracts";
import {
  formatMoney,
  formatPercent,
  type MoneyPrecision,
} from "./format/money";
import { MINUS } from "./format/text";

/** How a gain is expressed: the shared unit setting, `€` or `%`. */
export type GainUnit = Unit;

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

/** The value a gain reads as, in the unit it is written in. */
export interface GainAmount {
  amount: Decimal;
  unit: GainUnit;
}

/**
 * The value of a gain in the unit asked for. Without euros (an anonymous
 * viewer) it is the percentage; without a percentage (a start at zero) the
 * euros; with neither, `null`.
 */
export function gainAmount(gain: GainInput, unit: GainUnit): GainAmount | null {
  const eur = gain.eur ?? null;
  if (unit === "eur" && eur !== null) {
    return { amount: eur, unit: "eur" };
  }
  if (gain.percent !== null) {
    return { amount: gain.percent, unit: "percent" };
  }
  return eur === null ? null : { amount: eur, unit: "eur" };
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
  const shown = gainAmount(gain, unit);
  if (shown === null) {
    return null;
  }
  return shown.unit === "eur"
    ? display(
        formatMoney(shown.amount, language, { precision, signed: true }),
        "eur",
      )
    : display(
        formatPercent(shown.amount, language, { signed: true }),
        "percent",
      );
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
