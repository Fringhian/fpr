import type { Period } from "@fpr/contracts";
import { Trans, useTranslation } from "react-i18next";
import {
  type GainInput,
  type GainTone,
  type GainUnit,
  gainDisplay,
  sentenceAmount,
} from "../../../lib/gain";
import { useLanguage } from "../../../lib/i18n";
import { GAIN_TONE_TEXT } from "../../atoms/gain-value/gain-value";
import { Headline } from "./sentence-parts";

/** The word a headline reads a gain with, by its tone: up, down or flat. */
export const HEADLINE_KEY = {
  positive: "up",
  negative: "down",
  flat: "flat",
} as const satisfies Record<GainTone, string>;

/**
 * The headline: the viewer's result for the period, or, for a guest or an anonymous
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
  const amount = sentenceAmount(gain, language, watching);

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
