import type { Portfolio } from "@fpr/contracts";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { LoadingPlaceholder } from "../../../components/atoms/loading-placeholder/loading-placeholder";
import * as Holdings from "../../../components/organisms/holdings/holdings";
import { lookOf } from "../../../lib/look";
import { useSession } from "../../../lib/session/use-session";
import { useViewState } from "../../../lib/view-state/use-view-state";

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
  const { setting, anonymous } = useViewState();
  const heldByYou = useMemo(
    () =>
      yourPortfolio && {
        look: lookOf(person),
        shareIds: new Set(yourPortfolio.holdings.map(({ share }) => share.id)),
      },
    [yourPortfolio, person],
  );

  return portfolio === undefined ? (
    <LoadingPlaceholder className="h-[10rem]" />
  ) : (
    <Holdings.Basic
      aria-label={t("memberPage.holdings", { name })}
      holdings={portfolio.holdings}
      unit={setting.unit}
      anonymous={anonymous}
      heldByYou={heldByYou}
      shareLink={(share) => (
        <Link to="/shares/$shareId" params={{ shareId: share.id }} />
      )}
    />
  );
}
