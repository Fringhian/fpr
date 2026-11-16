import { DesktopIcon } from "@phosphor-icons/react/Desktop";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { usePhone } from "../../../lib/use-phone";
import { MessagePage } from "../../-states/message-page";

/**
 * The admin area: the admin, and anonymous viewers read-only. It works on
 * tablet and desktop; a phone shows a message in its place.
 */
export const Route = createFileRoute("/_app/admin")({
  staticData: { access: "adminArea" },
  component: AdminArea,
});

function AdminArea() {
  const { t } = useTranslation();
  const phone = usePhone();

  return phone ? (
    <MessagePage
      icon={DesktopIcon}
      title={t("pageStates.adminOnPhone.title")}
      description={t("pageStates.adminOnPhone.description")}
    />
  ) : (
    <Outlet />
  );
}
