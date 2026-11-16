import { useRender } from "@base-ui/react/use-render";
import { type ReactElement, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { type Decimal, formatMoney, formatPercent } from "../../../lib/format";
import { useLanguage } from "../../../lib/i18n";
import { Icon, type IconProps } from "../../foundations/icon/icon";
import {
  Chart,
  type ChartColor,
  type ChartLine,
  type ChartPoint,
} from "../chart/chart";

export const card =
  "relative flex min-w-0 flex-col gap-s p-m font-sans text-primary";

/** The value line, at the card's foot whatever the height of the cards beside it. */
export const foot = "mt-auto flex flex-wrap items-center justify-between gap-s";

export const caption = "text-xs text-secondary";

const big = "text-l font-semibold tabular-nums";

/**
 * The card's big figure: an amount in whole euros, or, for an anonymous
 * viewer, the weight in percent of the portfolio. Nothing when it is missing.
 */
export function CardFigure({
  anonymous,
  amountEur,
  weight,
}: {
  anonymous: boolean;
  amountEur: Decimal | null | undefined;
  weight: Decimal | null;
}) {
  const { t } = useTranslation();
  const language = useLanguage();

  if (anonymous) {
    return weight === null ? null : (
      <span className="flex flex-wrap items-baseline gap-x-xs">
        <span className={big}>{formatPercent(weight, language)}</span>
        <span className={caption}>{t("holdingCard.ofPortfolio")}</span>
      </span>
    );
  }
  return amountEur === null || amountEur === undefined ? null : (
    <span className={big}>
      {formatMoney(amountEur, language, { precision: "euros" })}
    </span>
  );
}

/**
 * The name as a link to the share's page. Its hit area stretches over the
 * whole card, under the ⋯ button, and its focus ring draws round the card.
 */
export function NameLink({
  name,
  link,
  icon,
}: {
  name: string;
  link: ReactElement;
  icon: IconProps["icon"];
}) {
  return useRender({
    render: link,
    defaultTagName: "a",
    props: {
      className: cn(
        "flex min-w-0 items-center gap-xs text-primary no-underline outline-none after:absolute after:inset-0 after:rounded-l after:content-['']",
        "",
        "",
        "",
        "hover:underline",
        "focus-visible:after:focus-ring",
      ),
      children: (
        <>
          <span className="truncate">{name}</span>
          <Icon icon={icon} size="s" className="text-secondary" />
        </>
      ),
    },
  });
}

/** The share's price over the period, as a sparkline in the colour of the gain. */
export function Curve({
  name,
  points,
  color,
}: {
  name: string;
  points: readonly ChartPoint[];
  color: ChartColor;
}) {
  const { t } = useTranslation();
  const lines = useMemo<readonly ChartLine[]>(
    () => [{ id: "price", label: name, color, points }],
    [name, color, points],
  );

  return (
    <Chart
      variant="sparkline"
      unit="money"
      lines={lines}
      label={t("holdingCard.curve", { name })}
    />
  );
}
