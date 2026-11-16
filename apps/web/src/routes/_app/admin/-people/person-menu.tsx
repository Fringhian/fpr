import type { AdminPerson } from "@fpr/contracts";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import * as Menu from "../../../../components/molecules/menu/menu";
import { EditPortfolioLink } from "./edit-portfolio-link";
import { hasPassword, hasPortfolio, type PeopleActions } from "./people-model";

/**
 * The ⋯ menu's items for a person: Edit, Edit portfolio for someone with a
 * portfolio, Replace link, Reset password for someone with a password, then
 * Revoke or Restore access, and Delete. For the last admin, the items that
 * would leave FPR without one are disabled, and a note says why.
 */
export function PersonMenu({
  person,
  lastAdmin,
  actions,
}: {
  person: AdminPerson;
  lastAdmin: boolean;
  actions: PeopleActions;
}) {
  const { t } = useTranslation();
  const noteId = useId();

  const locked = lastAdmin
    ? { disabled: true, "aria-describedby": noteId }
    : {};
  const open = (kind: "edit" | "replaceLink" | "resetKey" | "delete") => () =>
    actions.show({ kind, person });

  return (
    <>
      <Menu.Item onClick={open("edit")}>{t("adminPeople.menu.edit")}</Menu.Item>
      {hasPortfolio(person.role) ? (
        <Menu.LinkItem render={<EditPortfolioLink userId={person.id} />}>
          {t("adminPeople.menu.editPortfolio")}
        </Menu.LinkItem>
      ) : null}
      <Menu.Item {...locked} onClick={open("replaceLink")}>
        {t("adminPeople.menu.replaceLink")}
      </Menu.Item>
      {hasPassword(person) ? (
        <Menu.Item onClick={open("resetKey")}>
          {t("adminPeople.menu.resetKey")}
        </Menu.Item>
      ) : null}
      <Menu.Separator />
      {person.accessStatus === "revoked" ? (
        <Menu.Item onClick={() => actions.restore(person)}>
          {t("adminPeople.menu.restore")}
        </Menu.Item>
      ) : (
        <Menu.Item
          intent="danger"
          {...locked}
          onClick={() => actions.revoke(person)}
        >
          {t("adminPeople.menu.revoke")}
        </Menu.Item>
      )}
      <Menu.Item intent="danger" {...locked} onClick={open("delete")}>
        {t("adminPeople.menu.delete")}
      </Menu.Item>
      {lastAdmin ? (
        <Menu.Note id={noteId}>
          {t("adminPeople.menu.lastAdmin", { name: person.displayName })}
        </Menu.Note>
      ) : null}
    </>
  );
}
