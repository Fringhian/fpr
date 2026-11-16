import type { Portfolio, PortfolioHolding } from "@fpr/contracts";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "../../../components/atoms/badge/badge";
import { Card } from "../../../components/atoms/card/card";
import { AllocationBar } from "../../../components/molecules/allocation-bar/allocation-bar";
import * as HoldingCard from "../../../components/molecules/holding-card/holding-card";
import { cn } from "../../../lib/cn";
import { formatMoney } from "../../../lib/format/money";
import { useLanguage } from "../../../lib/i18n";
import type { MemberColor } from "../../../lib/member-color";

/**
 * One holding, read-only: its name, the Manual badge, the quantity as
 * entered with the latest price, then its value, or “Price pending” while its
 * prices haven't arrived. No curve and no gain: nothing has moved yet for the
 * person.
 */
function Holding({ holding }: { holding: PortfolioHolding }) {
  const nameId = useId();

  return (
    <HoldingCard.Root aria-labelledby={nameId}>
      <HoldingCard.Header>
        <HoldingCard.Name id={nameId}>{holding.share.name}</HoldingCard.Name>
        {holding.share.kind === "manual" ? <Badge state="manual" /> : null}
      </HoldingCard.Header>
      <HoldingCard.Details
        quantity={holding.quantity}
        latestPrice={holding.latestPrice}
        anonymous={false}
        timeZone={undefined}
      />
      <HoldingCard.Foot>
        {holding.latestPrice === null ? (
          <Badge state="pricePending" />
        ) : (
          <HoldingCard.Figure
            anonymous={false}
            amountEur={holding.valueEur}
            weight={holding.weight}
          />
        )}
      </HoldingCard.Foot>
    </HoldingCard.Root>
  );
}

/** The balance, “Incomplete” while a price is pending, and how it splits. */
function Total({
  portfolio,
  color,
}: {
  portfolio: Portfolio;
  color: MemberColor;
}) {
  const { t } = useTranslation();
  const language = useLanguage();

  return (
    <Card className="grid gap-s p-m">
      <div className="flex flex-wrap items-center gap-x-s gap-y-xs">
        <span className="text-s text-secondary">
          {t("onboarding.portfolio.total")}
        </span>
        <span className="text-l font-semibold tabular-nums">
          {formatMoney(portfolio.balanceEur, language, { precision: "euros" })}
        </span>
        {portfolio.incomplete ? <Badge state="incomplete" /> : null}
      </div>
      <AllocationBar
        color={color}
        holdings={portfolio.holdings.map(({ share, weight }) => ({
          id: share.id,
          name: share.name,
          weight,
        }))}
        cashWeight={portfolio.cashWeight}
      />
    </Card>
  );
}

/** The portfolio the admin prepared, read-only: the total and its split, each holding, then the cash. */
export function PreparedPortfolio({
  portfolio,
  color,
}: {
  portfolio: Portfolio;
  color: MemberColor;
}) {
  return (
    <>
      <Total portfolio={portfolio} color={color} />
      <div
        className={cn(
          "grid gap-s",
          "grid-cols-1",
          "tablet:grid-cols-2",
          "desktop:grid-cols-1",
        )}
      >
        {portfolio.holdings.map((holding) => (
          <Holding key={holding.share.id} holding={holding} />
        ))}
        <HoldingCard.Cash
          amountEur={portfolio.cashEur}
          weight={portfolio.cashWeight}
        />
      </div>
    </>
  );
}
