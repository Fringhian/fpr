import type { Language, Period } from "@fpr/contracts";
import { Trans, useTranslation } from "react-i18next";
import { formatMoney, formatPercent } from "../../../lib/format/money";
import {
  type GainInput,
  type GainTone,
  type GainUnit,
  gainDisplay,
} from "../../../lib/gain";
import { useLanguage } from "../../../lib/i18n";
import { GAIN_TONE_TEXT } from "../../atoms/gain-value/gain-value";
import { Headline } from "./sentence-parts";

const HEADLINE_KEY = {
  positive: "up",
  negative: "down",
  flat: "flat",
} as const satisfies Record<GainTone, string>;

/**
 * A gain written for the headline, in whole euros then in percent:
 * `€512 (+4.2%)`. Unsigned euros read after “up” or “down”; signed ones
 * after a leader's name. Either part alone when the other is missing.
 */
function headlineAmount(
  gain: GainInput,
  language: Language,
  signed: boolean,
): string | null {
  const eur = gain.eur ?? null;
  const money =
    eur === null
      ? null
      : formatMoney(signed ? eur : eur.replace(/^-/, ""), language, {
          precision: "euros",
          signed,
        });
  const percent =
    gain.percent === null
      ? null
      : formatPercent(gain.percent, language, { signed: true });
  if (money !== null && percent !== null) {
    return `${money} (${percent})`;
  }
  return money ?? percent;
}

/**
 * The headline: your result for the period, or, for a guest or an anonymous
 * viewer, the leader's, named. Nothing when the gain has no value.
 */
export function RaceHeadline({
  gain,
  leaderName,
  period,
  unit,
}: {
  gain: GainInput;
  leaderName: string | null;
  period: Period;
  unit: GainUnit;
}) {
  const { t } = useTranslation();
  const language = useLanguage();

  const watching = leaderName !== null;
  const tone = gainDisplay(gain, unit, language)?.tone ?? null;
  const amount = headlineAmount(gain, language, watching);

  return amount === null || tone === null ? null : (
    <Headline>
      <Trans
        i18nKey={
          watching
            ? "sentence.headline.leader"
            : `sentence.headline.${HEADLINE_KEY[tone]}`
        }
        values={{
          period: t(`sentence.period.${period}.start`),
          name: leaderName ?? undefined,
          amount,
        }}
        components={{ gain: <span className={GAIN_TONE_TEXT[tone]} /> }}
      />
    </Headline>
  );
}
