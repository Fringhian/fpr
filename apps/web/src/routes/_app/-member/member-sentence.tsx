import type { Gain, Language, Period } from "@fpr/contracts";
import Big from "big.js";
import type { TFunction } from "i18next";
import { Trans, useTranslation } from "react-i18next";
import { GAIN_TONE_TEXT } from "../../../components/atoms/gain-value/gain-value";
import { HEADLINE_KEY } from "../../../components/molecules/sentence/sentence-headline";
import { cn } from "../../../lib/cn";
import { formatMoney } from "../../../lib/format/money";
import { formatNumber } from "../../../lib/format/number";
import {
  type GainUnit,
  gainAmount,
  gainDisplay,
  sentenceAmount,
} from "../../../lib/gain";
import { useLanguage } from "../../../lib/i18n";

/**
 * How the member's gain compares with the viewer's, in the unit both read in:
 * “1.9 points ahead of you”, “€320 behind you”, or level once rounded. `null`
 * when the two can't be read in the same unit.
 */
function comparison(
  theirs: Gain,
  yours: Gain,
  unit: GainUnit,
  { t, language }: { t: TFunction; language: Language },
): string | null {
  const a = gainAmount(theirs, unit);
  const b = gainAmount(yours, unit);
  if (a === null || b === null || a.unit !== b.unit) return null;
  const percent = a.unit === "percent";
  const gap = new Big(a.amount).minus(b.amount).round(percent ? 1 : 0);
  if (gap.eq(0)) return t("memberPage.compare.level");
  const size = gap.abs().toFixed(percent ? 1 : 0);
  const difference = percent
    ? t("memberPage.points", {
        count: Number(size),
        points: formatNumber(size, language, { minimumFractionDigits: 1 }),
      })
    : formatMoney(size, language, { precision: "euros" });
  return t(`memberPage.compare.${gap.gt(0) ? "ahead" : "behind"}`, {
    difference,
  });
}

/**
 * The member's result for the period, “This month, Sam is up +6.1%.”, then
 * how it compares with the viewer's when the viewer is in the race too:
 * “That's 1.9 points ahead of you.” Nothing when the gain has no value.
 */
export function MemberSentence({
  name,
  gain,
  yours,
  period,
  unit,
}: {
  name: string;
  gain: Gain;
  /** The viewer's gain over the period, when they are in the race: a guest or an anonymous viewer has none. */
  yours: Gain | undefined;
  period: Period;
  unit: GainUnit;
}) {
  const { t } = useTranslation();
  const language = useLanguage();

  const tone = gainDisplay(gain, unit, language)?.tone;
  const amount = sentenceAmount(gain, language, false);
  const compared =
    yours === undefined ? null : comparison(gain, yours, unit, { t, language });

  return tone === undefined || amount === null ? null : (
    <p
      className={cn(
        "text-primary text-balance",
        "text-s",
        "tablet:text-m",
        "desktop:text-m",
      )}
    >
      <Trans
        i18nKey={`memberPage.headline.${HEADLINE_KEY[tone]}`}
        values={{ period: t(`sentence.period.${period}.start`), name, amount }}
        components={{
          gain: (
            <span
              className={cn(
                "font-semibold whitespace-nowrap",
                GAIN_TONE_TEXT[tone],
              )}
            />
          ),
        }}
      />
      {compared === null ? null : ` ${compared}`}
    </p>
  );
}
