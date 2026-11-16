import type { Id } from "@fpr/contracts";
import { useTranslation } from "react-i18next";
import { editPortfolioLink } from "../../../lib/edit-portfolio";
import { lookOf } from "../../../lib/look";
import { useMembers } from "../../../lib/members";
import { useViewState } from "../../../lib/view-state/use-view-state";
import { HistoryView } from "./history-screen";

/**
 * A member's history for the admin, from their page in edit mode: every
 * change, each with ⋯ to edit or delete it, below their page in edit mode.
 */
export function MemberHistoryScreen({ userId }: { userId: Id }) {
  const { t } = useTranslation();
  const { setting } = useViewState();
  const members = useMembers(setting.period);

  const row = members.data?.members.find(({ member }) => member.id === userId);
  const name = row ? lookOf(row.member).name : t("pages.member");

  return (
    <HistoryView
      userId={userId}
      back={{ label: name, link: editPortfolioLink(userId) }}
      none={t("memberPage.notStarted", { name })}
    />
  );
}
