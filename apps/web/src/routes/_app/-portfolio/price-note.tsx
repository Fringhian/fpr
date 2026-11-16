import type { Portfolio, Timestamp } from "@fpr/contracts";
import { useTranslation } from "react-i18next";
import { formatDate, formatTime } from "../../../lib/format/date";
import { formatList } from "../../../lib/format/text";
import { HelpInfo } from "../../../lib/help-info";
import { useLanguage } from "../../../lib/i18n";
import { raceDayOf, raceTimeZone, raceToday } from "../../../lib/race-day";

/** “Prices as of 14:30” today, “Prices as of 3 Mar” on an older day. */
function PricesAsOf({ at }: { at: Timestamp }) {
  const { t } = useTranslation();
  const language = useLanguage();

  const timeZone = raceTimeZone();
  const today = raceDayOf(at) === raceToday();

  return (
    <span>
      {today
        ? t("portfolioPage.pricesAsOfTime", {
            time: formatTime(at, language, { timeZone }),
          })
        : t("portfolioPage.pricesAsOfDate", {
            date: formatDate(at, language, { timeZone }),
          })}
    </span>
  );
}

/** “Incomplete: 1 price pending”, and ⓘ, which says which shares wait for their prices and that they aren't counted. */
function Incomplete({ pending }: { pending: readonly string[] }) {
  const { t } = useTranslation();
  const language = useLanguage();

  const title = t("portfolioPage.incomplete.title");

  return (
    <span className="inline-flex items-center gap-xs">
      <span className="text-negative">
        {t("portfolioPage.incomplete.note", { count: pending.length })}
      </span>
      <HelpInfo section="missing" title={title}>
        {t("portfolioPage.incomplete.description", {
          count: pending.length,
          names: formatList(pending, language),
        })}
      </HelpInfo>
    </span>
  );
}

/**
 * Under the sentence: the time of the prices the balance uses, then, while a
 * share's prices haven't arrived, that the balance is incomplete.
 */
export function PriceNote({ portfolio }: { portfolio: Portfolio }) {
  const pending = portfolio.holdings
    .filter((holding) => holding.latestPrice === null)
    .map((holding) => holding.share.name);

  return portfolio.latestPricesAt === null && !portfolio.incomplete ? null : (
    <p className="flex flex-wrap items-center gap-x-xs text-xs text-secondary">
      {portfolio.latestPricesAt === null ? null : (
        <PricesAsOf at={portfolio.latestPricesAt} />
      )}
      {portfolio.latestPricesAt !== null && portfolio.incomplete ? (
        <span aria-hidden>·</span>
      ) : null}
      {portfolio.incomplete ? <Incomplete pending={pending} /> : null}
    </p>
  );
}
