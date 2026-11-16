import type { Portfolio } from "@fpr/contracts";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { lookOf } from "../../../lib/look";
import { useSession } from "../../../lib/session/use-session";
import { PortfolioHoldings } from "../-portfolio-sections/portfolio-holdings";

/**
 * Every share the member holds, each card opening the share's page, the
 * viewer's picture on the ones they hold too.
 */
export function MemberHoldings({
  name,
  portfolio,
  yourPortfolio,
}: {
  /** The member's name, which names the list. */
  name: string;
  /** Their portfolio, or `undefined` while it loads. */
  portfolio: Portfolio | undefined;
  /** The viewer's, when they are in the race too. */
  yourPortfolio: Portfolio | undefined;
}) {
  const { t } = useTranslation();
  const { person } = useSession();
  const heldByYou = useMemo(
    () =>
      yourPortfolio && {
        look: lookOf(person),
        shareIds: new Set(yourPortfolio.holdings.map(({ share }) => share.id)),
      },
    [yourPortfolio, person],
  );

  return (
    <PortfolioHoldings
      aria-label={t("memberPage.holdings", { name })}
      portfolio={portfolio}
      heldByYou={heldByYou}
    />
  );
}
