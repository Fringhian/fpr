import type { Portfolio, ShareSummary } from "@fpr/contracts";
import { Link } from "@tanstack/react-router";
import { LoadingPlaceholder } from "../../../components/atoms/loading-placeholder/loading-placeholder";
import * as Holdings from "../../../components/organisms/holdings/holdings";
import { useViewState } from "../../../lib/view-state/use-view-state";

const shareLink = (share: ShareSummary) => (
  <Link to="/shares/$shareId" params={{ shareId: share.id }} />
);

/**
 * A portfolio's holdings, each card opening the share's page, in the unit and
 * for the viewer of the view state: a member's page and Portfolio. It holds
 * its place while the portfolio loads. Every prop of `Holdings.Basic` but the
 * ones it sets itself: `heldByYou` on someone else's page, `actions` and the
 * cash card as children on one's own.
 */
export function PortfolioHoldings({
  portfolio,
  ...props
}: {
  /** The portfolio, or `undefined` while it loads. */
  portfolio: Portfolio | undefined;
} & Omit<
  Holdings.BasicProps,
  "holdings" | "unit" | "anonymous" | "shareLink"
>) {
  const { setting, anonymous } = useViewState();

  return portfolio === undefined ? (
    <LoadingPlaceholder className="h-[10rem]" />
  ) : (
    <Holdings.Basic
      {...props}
      holdings={portfolio.holdings}
      unit={setting.unit}
      anonymous={anonymous}
      shareLink={shareLink}
    />
  );
}
