import type { ShareDetail } from "@fpr/contracts";
import { useParams } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LoadingPlaceholder } from "../../../components/atoms/loading-placeholder/loading-placeholder";
import { PageMessage } from "../../../components/templates/page-message/page-message";
import { useSession } from "../../../lib/session/use-session";
import { Screen } from "../../-shell/screen";
import { useLoadFailedMessage } from "../../-states/load-failed";
import { AppNotFound } from "../../-states/not-found";
import { EditShare } from "./manual/edit-share";
import { ManualSections } from "./manual/manual-sections";
import { ShareChart } from "./share-chart";
import { ShareHeader } from "./share-header";
import { ShareHolders } from "./share-holders";
import { SharePosition } from "./share-position";
import { type ShareData, useShareData } from "./use-share-data";

/**
 * The page once the share is known: the header on the sky; the viewer's
 * position with Buy and Sell when they have a portfolio; the chart; a manual
 * share's values and their edits; then who holds it.
 */
function ShareView({ share, data }: { share: ShareDetail; data: ShareData }) {
  const { writer } = useSession();

  const manual = share.kind === "manual";

  return (
    <Screen
      title={share.name}
      back="shares"
      period
      header={
        <ShareHeader
          share={share}
          lastValue={data.values?.[0]}
          edit={manual && writer ? <EditShare share={share} /> : null}
        />
      }
    >
      <div className="grid gap-m pb-l">
        {writer ? <SharePosition share={share} /> : null}
        <ShareChart share={share} points={data.points} holders={data.holders} />
        {manual ? (
          <ManualSections
            share={share}
            values={data.values}
            events={data.events}
            writer={writer}
          />
        ) : null}
        {data.holders?.length ? <ShareHolders holders={data.holders} /> : null}
      </div>
    </Screen>
  );
}

/**
 * `/shares/$shareId`: a share's page. It holds its place while the share
 * loads; a failed load leaves a message with Retry under the page bar; an
 * unknown share is not found.
 */
export function ShareScreen() {
  const { t } = useTranslation();
  const { shareId } = useParams({ from: "/_app/shares/$shareId" });
  const data = useShareData(shareId);
  const failed = useLoadFailedMessage(data.retry);

  const placeholder = (children: ReactNode) => (
    <Screen title={t("pages.share")} back="shares" period>
      {children}
    </Screen>
  );

  if (data.missing) return <AppNotFound />;
  if (data.failed) return placeholder(<PageMessage {...failed} />);
  if (data.share === undefined) {
    return placeholder(
      <LoadingPlaceholder className="h-[15rem]">
        {t("sharePage.loading")}
      </LoadingPlaceholder>,
    );
  }
  return <ShareView share={data.share} data={data} />;
}
