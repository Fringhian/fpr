import { UsersThreeIcon } from "@phosphor-icons/react/UsersThree";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { LoadingPlaceholder } from "../../../components/atoms/loading-placeholder/loading-placeholder";
import * as EmptyState from "../../../components/molecules/empty-state/empty-state";
import * as MemberStrip from "../../../components/organisms/member-strip/member-strip";
import { PageMessage } from "../../../components/templates/page-message/page-message";
import { useLanguage } from "../../../lib/i18n";
import { useMembers } from "../../../lib/members";
import { useSession } from "../../../lib/session/use-session";
import { useViewState } from "../../../lib/view-state/use-view-state";
import { Screen } from "../../-shell/screen";
import { useLoadFailedMessage } from "../../-states/load-failed";
import { memberStrips, type StripData } from "./member-strips";

/** The strips, each opening the member's page, or the viewer's own Portfolio. */
function Strips({ strips }: { strips: readonly StripData[] }) {
  return (
    <MemberStrip.List className="pb-l">
      {strips.map(({ id, ...strip }) => (
        <MemberStrip.Basic
          key={id}
          {...strip}
          link={
            strip.you ? (
              <Link to="/portfolio" />
            ) : (
              <Link to="/members/$userId" params={{ userId: id }} />
            )
          }
        />
      ))}
    </MemberStrip.List>
  );
}

function Empty() {
  const { t } = useTranslation();

  return (
    <EmptyState.Root className="py-xl">
      <EmptyState.Icon icon={UsersThreeIcon} />
      <EmptyState.Title>{t("membersPage.empty.title")}</EmptyState.Title>
      <EmptyState.Description>
        {t("membersPage.empty.body")}
      </EmptyState.Description>
    </EmptyState.Root>
  );
}

/**
 * Members: every member, one strip each, the viewer first then everyone
 * alphabetically, whatever the period. A failed load leaves a message with
 * Retry under the page bar.
 */
export function MembersScreen() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { person } = useSession();
  const { setting } = useViewState();
  const members = useMembers(setting.period);
  const failed = useLoadFailedMessage(() => void members.refetch());
  const strips = useMemo(
    () =>
      members.data &&
      memberStrips(members.data.members, {
        viewerId: person.id,
        unit: setting.unit,
        language,
      }),
    [members.data, person.id, setting.unit, language],
  );

  const content =
    strips === undefined ? (
      members.isError ? (
        <PageMessage {...failed} />
      ) : (
        <LoadingPlaceholder className="h-[15rem]">
          {t("membersPage.loading")}
        </LoadingPlaceholder>
      )
    ) : strips.length === 0 ? (
      <Empty />
    ) : (
      <Strips strips={strips} />
    );

  return (
    <Screen title={t("pages.members")} period>
      {content}
    </Screen>
  );
}
