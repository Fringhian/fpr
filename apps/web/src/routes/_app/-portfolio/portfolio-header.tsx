import type { Period, Portfolio } from "@fpr/contracts";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "../../../components/atoms/button/button";
import { GAIN_TONE_TEXT } from "../../../components/atoms/gain-value/gain-value";
import { HEADLINE_KEY } from "../../../components/molecules/sentence/sentence-headline";
import { Headline } from "../../../components/molecules/sentence/sentence-parts";
import { cn } from "../../../lib/cn";
import { formatMoney } from "../../../lib/format/money";
import { gainDisplay, sentenceAmount } from "../../../lib/gain";
import { useLanguage } from "../../../lib/i18n";
import type { RecordLink } from "../-portfolio-sections/record-link";
import { PriceNote } from "./price-note";

/**
 * The page's heading: “Your portfolio is worth €12,374, up €512 (+4.2%) this
 * month”, the worth alone while the gain has no value.
 */
function PortfolioHeadline({
  portfolio,
  period,
}: {
  portfolio: Portfolio;
  period: Period;
}) {
  const { t } = useTranslation();
  const language = useLanguage();

  const balance = formatMoney(portfolio.balanceEur ?? "0", language, {
    precision: "euros",
  });
  const tone = gainDisplay(portfolio.gain, "eur", language)?.tone;
  const amount = sentenceAmount(portfolio.gain, language, false);
  const key =
    tone === undefined || amount === null ? "worth" : HEADLINE_KEY[tone];

  return (
    <Headline className="mt-0">
      <Trans
        i18nKey={`portfolioPage.headline.${key}`}
        values={{
          balance,
          amount,
          period: t(`sentence.period.${period}.inline`),
        }}
        components={{
          gain: (
            <span className={tone === undefined ? "" : GAIN_TONE_TEXT[tone]} />
          ),
        }}
      />
    </Headline>
  );
}

/**
 * Portfolio's header on the sky: the sentence, the time of the prices with
 * the incomplete note, and Record a change from tablet up. The phone has it
 * under the chart.
 */
export function PortfolioHeader({
  portfolio,
  period,
  recordLink,
}: {
  portfolio: Portfolio;
  period: Period;
  recordLink: RecordLink;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-start gap-l">
      <div className="grid min-w-0 grow gap-s">
        <PortfolioHeadline portfolio={portfolio} period={period} />
        <PriceNote portfolio={portfolio} />
      </div>
      <Button
        intent="primary"
        nativeButton={false}
        render={recordLink()}
        className={cn(
          "shrink-0",
          "hidden",
          "tablet:inline-grid",
          "desktop:inline-grid",
        )}
      >
        {t("portfolioPage.record")}
      </Button>
    </div>
  );
}
