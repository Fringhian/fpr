import type { ShareDetail, ShareValue } from "@fpr/contracts";
import { Trans, useTranslation } from "react-i18next";
import { Badge } from "../../../components/atoms/badge/badge";
import { Chip } from "../../../components/atoms/chip/chip";
import { GainValue } from "../../../components/atoms/gain-value/gain-value";
import { Picture } from "../../../components/atoms/picture/picture";
import { cn } from "../../../lib/cn";
import { formatDate } from "../../../lib/format/date";
import { formatMoney } from "../../../lib/format/money";
import { HelpInfo } from "../../../lib/help-info";
import { useLanguage } from "../../../lib/i18n";
import { lookOf } from "../../../lib/look";
import { usePriceTime } from "../../../lib/price-time";
import { raceTimeZone } from "../../../lib/race-day";
import { useViewState } from "../../../lib/view-state/use-view-state";

const caption = "text-xs text-secondary";
const PHONE_ONLY = cn("", "inline", "tablet:hidden", "desktop:hidden");
const FROM_TABLET = cn(
  "items-center gap-xs",
  "hidden",
  "tablet:inline-flex",
  "desktop:inline-flex",
);

/**
 * A manual share's last value: “on 3 Mar, entered by” and the person's chip
 * from tablet up, “3 Mar · Lea” on phone.
 */
function EnteredBy({ value }: { value: ShareValue }) {
  const language = useLanguage();

  const date = formatDate(value.at, language, { timeZone: raceTimeZone() });
  const by = value.enteredBy && lookOf(value.enteredBy);
  return (
    <span className={caption}>
      <span className={PHONE_ONLY}>
        {[date, by?.name].filter(Boolean).join(" · ")}
      </span>
      <span className={FROM_TABLET}>
        {by ? (
          <Trans
            i18nKey="sharePage.enteredBy"
            values={{ date }}
            components={{
              person: (
                <Chip
                  className="text-xs"
                  picture={<Picture aria-hidden {...by} size="xs" />}
                >
                  {by.name}
                </Chip>
              ),
            }}
          />
        ) : (
          <Trans i18nKey="sharePage.enteredOn" values={{ date }} />
        )}
      </span>
    </span>
  );
}

/** The change over the period, “+2.4% this month”, then the price's time. */
function ChangeAndTime({ share }: { share: ShareDetail }) {
  const { t } = useTranslation();
  const priceTime = usePriceTime();
  const { setting } = useViewState();

  return (
    <span className={caption}>
      {share.change === null ? null : (
        <>
          <GainValue gain={share.change} unit={setting.unit} />{" "}
          {t(`sentence.period.${setting.period}.inline`)}
          {" · "}
        </>
      )}
      {share.latestPrice ? priceTime(share.latestPrice, raceTimeZone()) : null}
    </span>
  );
}

function ManualInfo() {
  const { t } = useTranslation();

  return (
    <HelpInfo section="manual" title={t("helpInfo.manual.title")} align="end">
      {t("helpInfo.manual.body")}
    </HelpInfo>
  );
}

/**
 * The latest price, big, with its change over the period and its time, or
 * who entered a manual share's last value and when: beside it on phone,
 * under it from tablet up. Price pending until the share has a price. A
 * manual share's ⓘ sits beside its price, or its pending badge.
 */
export function SharePrice({
  share,
  lastValue,
}: {
  share: ShareDetail;
  lastValue: ShareValue | undefined;
}) {
  const language = useLanguage();

  const manual = share.kind === "manual";
  const info = manual ? <ManualInfo /> : null;
  if (share.latestPrice === null) {
    return (
      <span className="inline-flex items-center gap-xs self-start">
        <Badge state="pricePending" />
        {info}
      </span>
    );
  }
  return (
    <div
      className={cn(
        "flex gap-x-s gap-y-xs",
        "flex-row flex-wrap items-baseline",
        "tablet:flex-col tablet:items-end",
        "desktop:flex-col desktop:items-end",
      )}
    >
      <span className="inline-flex items-center gap-xs">
        <span
          className={cn(
            "font-semibold text-primary tabular-nums",
            "text-xl",
            "tablet:text-display",
            "desktop:text-display",
          )}
        >
          {formatMoney(share.latestPrice.priceEur, language)}
        </span>
        {info}
      </span>
      {manual && lastValue ? (
        <EnteredBy value={lastValue} />
      ) : (
        <ChangeAndTime share={share} />
      )}
    </div>
  );
}
