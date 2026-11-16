import type { Id, Portfolio, Timestamp } from "@fpr/contracts";
import { useTranslation } from "react-i18next";
import * as HoldingCard from "../../../components/molecules/holding-card/holding-card";
import * as Menu from "../../../components/molecules/menu/menu";
import * as Holdings from "../../../components/organisms/holdings/holdings";
import { RACE_TIME_ZONE } from "../../../lib/race-day";
import { useViewState } from "../../../lib/view-state/use-view-state";
import { PortfolioHoldings } from "./portfolio-holdings";
import { useRecord } from "./record-link";

/**
 * The holdings of a portfolio its viewer may change, with the controls of
 * Portfolio: each card's ⋯ opens Buy more and Sell, and the cash card comes
 * last with Update cash, each at its step of Record a change.
 */
export function OwnedHoldings({
  userId,
  portfolio,
  cashSetAt,
  label,
}: {
  userId: Id;
  /** The portfolio, or `undefined` while it loads. */
  portfolio: Portfolio | undefined;
  /** The moment of the latest cash balance, once the log knows it. */
  cashSetAt: Timestamp | undefined;
  /** Names the list. */
  label: string;
}) {
  const { t } = useTranslation();
  const { anonymous } = useViewState();
  const record = useRecord(userId);

  return (
    <PortfolioHoldings
      aria-label={label}
      portfolio={portfolio}
      actions={({ share }) => (
        <>
          <Menu.LinkItem render={record.link({ kind: "buy", share: share.id })}>
            {t("ownedHoldings.buyMore")}
          </Menu.LinkItem>
          <Menu.LinkItem
            render={record.link({ kind: "sell", share: share.id })}
          >
            {t("ownedHoldings.sell")}
          </Menu.LinkItem>
        </>
      )}
    >
      {portfolio === undefined ? null : (
        <Holdings.Item>
          <HoldingCard.Cash
            amountEur={portfolio.cashEur}
            weight={portfolio.cashWeight}
            setOn={cashSetAt}
            anonymous={anonymous}
            timeZone={RACE_TIME_ZONE}
            onUpdateCash={() => record.open({ kind: "cash" })}
          />
        </Holdings.Item>
      )}
    </PortfolioHoldings>
  );
}
