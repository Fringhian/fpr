import type { Id } from "@fpr/contracts";
import { Navigate, useParams, useSearch } from "@tanstack/react-router";
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
import { HeaderAction, PhoneAction } from "../-portfolio-sections/page-action";
import { MemberChart } from "./member-chart";
import { EditableSections, EditBanner, useAdminAction } from "./member-edit";
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

/** Their chart, the admin's action on phone, then their holdings, read-only or with Portfolio's controls in edit mode. */
function Started({
  row,
  data,
  editing,
  phoneAction,
}: {
  row: MemberRow;
  data: ReturnType<typeof useMemberData>;
  editing: boolean;
  phoneAction: ReactNode;
}) {
  const { setting } = useViewState();

  const look = lookOf(row.member);

  return (
    <>
      <MemberChart
        member={look}
        history={data.history}
        yourHistory={data.yourHistory}
        portfolio={data.portfolio}
        unit={setting.unit}
      />
      {phoneAction}
      {editing ? (
        <EditableSections
          userId={row.member.id}
          name={look.name}
          portfolio={data.portfolio}
          rows={data.logRows}
          total={data.logTotal}
        />
      ) : (
        <MemberHoldings
          name={look.name}
          portfolio={data.portfolio}
          yourPortfolio={data.yourPortfolio}
        />
      )}
    </>
  );
}

/**
 * The page once the member is known: the header on the sky, then their chart
 * and holdings. For the admin, Edit portfolio; in edit mode, the banner first,
 * Record a change for them, and Portfolio's controls.
 */
function MemberView({
  row,
  data,
  editing,
}: {
  row: MemberRow;
  data: ReturnType<typeof useMemberData>;
  editing: boolean;
}) {
  const look = lookOf(row.member);
  const action = useAdminAction(row.member.id, look.name, editing);

  const phoneAction = action ? <PhoneAction {...action} /> : null;

  return (
    <Screen
      title={look.name}
      back="members"
      period
      header={
        <MemberHeader
          row={row}
          yours={data.viewer?.gain ?? undefined}
          action={action ? <HeaderAction {...action} icon={undefined} /> : null}
        />
      }
    >
      <div className="grid gap-m pb-l">
        {editing ? (
          <EditBanner userId={row.member.id} name={look.name} />
        ) : null}
        {row.firstEntryOn === null ? (
          <>
            <NotStarted name={look.name} />
            {phoneAction}
          </>
        ) : (
          <Started
            row={row}
            data={data}
            editing={editing}
            phoneAction={phoneAction}
          />
        )}
      </div>
    </Screen>
  );
}

/**
 * A member's page, read-only: who they are, their result compared with the
 * viewer's, their curve against the viewer's, and every holding. Not found
 * once the members list has loaded without them; a failed load leaves a
 * message with Retry under the page bar.
 */
function MemberPage({ userId, editing }: { userId: Id; editing: boolean }) {
  const { t } = useTranslation();
  const data = useMemberData(userId, editing);
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
  return <MemberView row={data.row} data={data} editing={editing} />;
}

/**
 * `/members/$userId`: the viewer's own page is their Portfolio. `?edit=true`
 * is the admin's edit mode; anyone else reads the page as usual.
 */
export function MemberScreen() {
  const { userId } = useParams({ from: "/_app/members/$userId/" });
  const { edit } = useSearch({ from: "/_app/members/$userId/" });
  const { person, admin, writer } = useSession();

  const own = userId === person.id && writer;

  return own ? (
    <Navigate to="/portfolio" replace />
  ) : (
    <MemberPage userId={userId} editing={edit === true && admin} />
  );
}
