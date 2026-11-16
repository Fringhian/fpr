import type { Id } from "@fpr/contracts";
import { writerRoles } from "@fpr/contracts/values";
import { Navigate, useParams } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LoadingPlaceholder } from "../../../components/atoms/loading-placeholder/loading-placeholder";
import * as EmptyState from "../../../components/molecules/empty-state/empty-state";
import { PageMessage } from "../../../components/templates/page-message/page-message";
import { lookOf } from "../../../lib/look";
import { useSession } from "../../../lib/session/use-session";
import { useViewState } from "../../../lib/view-state/use-view-state";
import { Screen } from "../../-shell/screen";
import { useLoadFailedMessage } from "../../-states/load-failed";
import { AppNotFound } from "../../-states/not-found";
import { MemberChart } from "./member-chart";
import { MemberHeader } from "./member-header";
import { MemberHoldings } from "./member-holdings";
import { type MemberRow, useMemberData } from "./use-member-data";

/** A member who hasn't recorded anything yet: no chart, and a line that says so. */
function NotStarted({ name }: { name: string }) {
  const { t } = useTranslation();

  return (
    <EmptyState.Root className="py-xl">
      <EmptyState.Icon />
      <EmptyState.Description>
        {t("memberPage.notStarted", { name })}
      </EmptyState.Description>
    </EmptyState.Root>
  );
}

/** The page once the member is known: the header on the sky, then their chart and holdings. */
function MemberView({
  row,
  data,
}: {
  row: MemberRow;
  data: ReturnType<typeof useMemberData>;
}) {
  const { setting } = useViewState();

  const look = lookOf(row.member);

  return (
    <Screen
      title={look.name}
      back="members"
      period
      header={<MemberHeader row={row} yours={data.viewer?.gain ?? undefined} />}
    >
      {row.firstEntryOn === null ? (
        <NotStarted name={look.name} />
      ) : (
        <div className="grid gap-m pb-l">
          <MemberChart
            member={look}
            history={data.history}
            yourHistory={data.yourHistory}
            portfolio={data.portfolio}
            unit={setting.unit}
          />
          <MemberHoldings
            name={look.name}
            portfolio={data.portfolio}
            yourPortfolio={data.yourPortfolio}
          />
        </div>
      )}
    </Screen>
  );
}

/**
 * A member's page, read-only: who they are, their result compared with the
 * viewer's, their curve against the viewer's, and every holding. Not found
 * once the members list has loaded without them; a failed load leaves a
 * message with Retry under the page bar.
 */
function MemberPage({ userId }: { userId: Id }) {
  const { t } = useTranslation();
  const data = useMemberData(userId);
  const failed = useLoadFailedMessage(data.retry);

  const placeholder = (children: ReactNode) => (
    <Screen title={t("pages.member")} back="members" period>
      {children}
    </Screen>
  );

  if (data.failed) return placeholder(<PageMessage {...failed} />);
  if (data.row === null) return <AppNotFound />;
  if (data.row === undefined) {
    return placeholder(
      <LoadingPlaceholder className="h-[15rem]">
        {t("memberPage.loading")}
      </LoadingPlaceholder>,
    );
  }
  return <MemberView row={data.row} data={data} />;
}

/** `/members/$userId`: the viewer's own page is their Portfolio. */
export function MemberScreen() {
  const { userId } = useParams({ from: "/_app/members/$userId/" });
  const { person, role } = useSession();

  const own =
    userId === person.id && writerRoles.some((writer) => writer === role);

  return own ? (
    <Navigate to="/portfolio" replace />
  ) : (
    <MemberPage userId={userId} />
  );
}
