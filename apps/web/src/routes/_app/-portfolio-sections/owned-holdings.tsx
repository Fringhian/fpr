import type { Id, Portfolio } from "@fpr/contracts";
import { useTranslation } from "react-i18next";
import * as HoldingCard from "../../../components/molecules/holding-card/holding-card";
import * as Menu from "../../../components/molecules/menu/menu";
import * as Holdings from "../../../components/organisms/holdings/holdings";
import { HelpInfo } from "../../../lib/help-info";
import { raceTimeZone } from "../../../lib/race-day";
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
  label,
}: {
  userId: Id;
  /** The portfolio, or `undefined` while it loads. */
  portfolio: Portfolio | undefined;
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
            setOn={portfolio.cashSetAt ?? undefined}
            anonymous={anonymous}
            timeZone={raceTimeZone()}
            onUpdateCash={() => record.open({ kind: "cash" })}
            info={
              <HelpInfo section="cash" title={t("helpInfo.cash.title")}>
                {t("helpInfo.cash.body")}
              </HelpInfo>
            }
          />
        </Holdings.Item>
      )}
    </PortfolioHoldings>
  );
}
