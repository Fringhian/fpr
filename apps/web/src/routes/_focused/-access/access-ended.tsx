import { ProhibitIcon } from "@phosphor-icons/react/Prohibit";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { TextLink } from "../../../components/atoms/text-link/text-link";
import { AccessState } from "./access-state";

/**
 * “Your access has ended”: after the API answered `access_ended`, mid-visit
 * or on a sign-in, and for an access link revoked or past its end date. Only
 * the admin can give access back.
 */
export function AccessEnded() {
  const { t } = useTranslation();

  return (
    <AccessState
      icon={ProhibitIcon}
      title={t("pageStates.accessEnded.title")}
      description={t("pageStates.accessEnded.description")}
    >
      <p className="text-s">
        <TextLink render={<Link to="/sign-in" />}>
          {t("pageStates.accessEnded.otherAccount")}
        </TextLink>
      </p>
    </AccessState>
  );
}
