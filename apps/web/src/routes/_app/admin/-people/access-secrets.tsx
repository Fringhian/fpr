import type {
  AdminPerson,
  AdminPersonWithLink,
  AdminResetKeyResult,
} from "@fpr/contracts";
import { useTranslation } from "react-i18next";
import { TextLink } from "../../../../components/atoms/text-link/text-link";
import { editPortfolioLink } from "../../../../lib/edit-portfolio";
import { formatDate, formatTime } from "../../../../lib/format/date";
import { useLanguage } from "../../../../lib/i18n";
import type { SecretContent } from "./dialog-steps";
import { hasPortfolio } from "./people-model";

/**
 * The link to a member's page in edit mode, where the admin records their
 * portfolio before sending the link.
 */
function PrepareLink({ person }: { person: AdminPerson }) {
  const { t } = useTranslation();

  return (
    <TextLink toPage className="text-s" render={editPortfolioLink(person.id)}>
      {t("adminPeople.link.prepare", { name: person.displayName })}
    </TextLink>
  );
}

/** What the dialogs show of a new access link and of a reset key. */
export function useAccessSecrets() {
  const { t } = useTranslation();
  const language = useLanguage();

  return {
    /** A new person's link, which offers to prepare their portfolio, or a replaced one's. */
    link: (
      { person, accessLink }: AdminPersonWithLink,
      { replaced }: { replaced: boolean },
    ): SecretContent => ({
      title: t(
        replaced ? "adminPeople.link.newTitle" : "adminPeople.link.title",
        {
          name: person.displayName,
        },
      ),
      description: t("adminPeople.link.description", {
        date: formatDate(person.claimBefore, language, { style: "long" }),
      }),
      label: t("adminPeople.link.label"),
      value: accessLink,
      hint: t("adminPeople.link.hint", { name: person.displayName }),
      start:
        !replaced && hasPortfolio(person.role) ? (
          <PrepareLink person={person} />
        ) : undefined,
    }),
    resetKey: (
      person: AdminPerson,
      { resetKey, expiresAt }: AdminResetKeyResult,
    ): SecretContent => ({
      title: t("adminPeople.resetKey.secretTitle", {
        name: person.displayName,
      }),
      description: t("adminPeople.resetKey.secretDescription", {
        date: formatDate(expiresAt, language, { style: "long" }),
        time: formatTime(expiresAt, language),
      }),
      label: t("adminPeople.resetKey.label"),
      value: resetKey,
      hint: t("adminPeople.resetKey.hint", { name: person.displayName }),
    }),
  };
}
