import type { Portfolio } from "@fpr/contracts";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/atoms/button/button";
import { LoadingPlaceholder } from "../../../components/atoms/loading-placeholder/loading-placeholder";
import { PageMessage } from "../../../components/templates/page-message/page-message";
import { lookOf } from "../../../lib/look";
import { useSession } from "../../../lib/session/use-session";
import { useViewState } from "../../../lib/view-state/use-view-state";
import { Screen } from "../../-shell/screen";
import { useLoadFailedMessage } from "../../-states/load-failed";
import { LatestChanges } from "../-portfolio-sections/latest-changes";
import { OwnedHoldings } from "../-portfolio-sections/owned-holdings";
import { type RecordLink, useRecord } from "../-portfolio-sections/record-link";
import { PortfolioChart } from "./portfolio-chart";
import { PortfolioHeader } from "./portfolio-header";
import { usePortfolioData } from "./use-portfolio-data";

/** Nothing recorded yet: how recording works, and Record a change. No period bar. */
function Empty({ recordLink }: { recordLink: RecordLink }) {
  const { t } = useTranslation();

  return (
    <Screen title={t("pages.portfolio")} heading={false}>
      <PageMessage
        icon={PlusIcon}
        title={t("portfolioPage.empty.title")}
        description={t("portfolioPage.empty.description")}
        action={
          <Button intent="primary" nativeButton={false} render={recordLink()}>
            {t("portfolioPage.record")}
          </Button>
        }
      />
    </Screen>
  );
}

/** The page once the portfolio is known: the header on the sky, the chart, the holdings and cash, the latest changes. */
function PortfolioView({
  portfolio,
  data,
  recordLink,
}: {
  portfolio: Portfolio;
  data: ReturnType<typeof usePortfolioData>;
  recordLink: RecordLink;
}) {
  const { t } = useTranslation();
  const { person } = useSession();
  const { setting } = useViewState();

  return (
    <Screen
      title={t("pages.portfolio")}
      period
      header={
        <PortfolioHeader
          portfolio={portfolio}
          period={setting.period}
          recordLink={recordLink}
        />
      }
    >
      <div className="grid gap-m pb-l">
        <PortfolioChart
          history={data.history}
          portfolio={portfolio}
          color={lookOf(person).color}
          recordLink={recordLink}
        />
        <OwnedHoldings
          userId={person.id}
          portfolio={portfolio}
          label={t("portfolioPage.holdings")}
        />
        <LatestChanges
          userId={person.id}
          rows={data.rows}
          total={data.total}
          historyLink={<Link to="/portfolio/history" />}
        />
      </div>
    </Screen>
  );
}

/**
 * Portfolio: what the viewer holds, how it splits, and the changes they
 * recorded. It holds its place while the portfolio loads; a failed load
 * leaves a message with Retry under the page bar; with nothing recorded, it
 * says how to start.
 */
export function PortfolioScreen() {
  const { t } = useTranslation();
  const { person } = useSession();
  const data = usePortfolioData();
  const { link: recordLink } = useRecord(person.id);
  const failed = useLoadFailedMessage(
    data.retry,
    t("portfolioPage.loadFailed"),
  );

  const title = t("pages.portfolio");

  if (data.failed) {
    return (
      <Screen title={title} heading={false}>
        <PageMessage {...failed} />
      </Screen>
    );
  }
  if (data.portfolio === undefined) {
    return (
      <Screen title={title} period>
        <LoadingPlaceholder className="h-[15rem]">
          {t("portfolioPage.loading")}
        </LoadingPlaceholder>
      </Screen>
    );
  }
  if (data.portfolio.firstEntryOn === null) {
    return <Empty recordLink={recordLink} />;
  }
  return (
    <PortfolioView
      portfolio={data.portfolio}
      data={data}
      recordLink={recordLink}
    />
  );
}
