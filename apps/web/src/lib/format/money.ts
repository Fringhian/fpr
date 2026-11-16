import type { Decimal, Gain, Language } from "@fpr/contracts";
import { formatNumber, signDisplay } from "./number";

/** `cents` for prices and amounts, `euros` for balances. */
export type MoneyPrecision = "cents" | "euros";

type MoneyOptions = {
  precision?: MoneyPrecision;
  /** A sign on every amount but zero, for gains: `+€512`, `−€18.30`. */
  signed?: boolean;
};

/** An amount in euros: `€1,234.56`, `1 234,56 €`. */
export function formatMoney(
  amount: Decimal,
  language: Language,
  { precision = "cents", signed = false }: MoneyOptions = {},
): string {
  const digits = precision === "cents" ? 2 : 0;
  return formatNumber(amount, language, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: signDisplay(signed),
  });
}

/** A percentage, given in percent, with one decimal: `16.2%`, `16,2 %`. */
export function formatPercent(
  percent: Decimal,
  language: Language,
  { signed = false }: { signed?: boolean } = {},
): string {
  return formatNumber(percent, language, {
    style: "unit",
    unit: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: signDisplay(signed),
  });
}

/** A gain in euros, then in percent when it has one: `+€512 (+4.2%)`. */
export function formatGain(
  gain: Gain,
  language: Language,
  { precision = "cents" }: Pick<MoneyOptions, "precision"> = {},
): string {
  const eur = formatMoney(gain.eur, language, { precision, signed: true });
  if (gain.percent === null) {
    return eur;
  }
  return `${eur} (${formatPercent(gain.percent, language, { signed: true })})`;
}
