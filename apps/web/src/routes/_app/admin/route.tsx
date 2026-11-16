import { DesktopIcon } from "@phosphor-icons/react/Desktop";
import {
  createFileRoute,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import * as Navigation from "../../../components/organisms/navigation/navigation";
import { PageMessage } from "../../../components/templates/page-message/page-message";
import { usePhone } from "../../../lib/use-phone";
import { Screen } from "../../-shell/screen";

/**
 * The admin area: the admin, and anonymous viewers read-only. It works on
 * tablet and desktop; a phone shows a message in its place, under the page's
 * bar.
 */
export const Route = createFileRoute("/_app/admin")({
  staticData: { access: "adminArea" },
  component: AdminArea,
});

function AdminArea() {
  const { t } = useTranslation();
  const phone = usePhone();
  const page = useRouterState({
    select: (state) => Navigation.destinationAt(state.location.pathname),
  });

  return phone ? (
    <Screen
      title={t(
        `navigation.items.${page === "trackedShares" ? page : "people"}`,
      )}
      heading={false}
    >
      <PageMessage
        icon={DesktopIcon}
        title={t("pageStates.adminOnPhone.title")}
        description={t("pageStates.adminOnPhone.description")}
      />
    </Screen>
  ) : (
    <Outlet />
  );
}
