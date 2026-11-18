import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import * as Toast from "../../components/molecules/toast/toast";
import * as Navigation from "../../components/organisms/navigation/navigation";
import * as AppLayout from "../../components/templates/app-layout/app-layout";
import { memberColor } from "../../lib/member-color";
import { signOut } from "../../lib/session/sign-out";
import { useSession } from "../../lib/session/use-session";
import { Settings } from "../-settings/settings";
import { tabSlide } from "./tab-slide";

const renderLink = ({ href, place }: Navigation.NavigationLink) => (
  <Link to={href} viewTransition={place === "tab" && tabSlide} />
);

/**
 * The template's frame around every everyday page, kept while the person
 * moves between them: the navigation for their role, its current item read
 * from the address, the page in the column, Settings, which the account menu
 * opens, and the toasts' region. Each page renders its own `Screen`.
 */
export function AppShell() {
  const { person, role } = useSession();
  const current = useRouterState({
    select: (state) => Navigation.destinationAt(state.location.pathname),
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <AppLayout.Frame
      userRole={role}
      current={current}
      account={{
        name: person.displayName,
        color: memberColor(person.color),
        photo: person.avatarUrl,
      }}
      renderLink={renderLink}
      onSettings={() => setSettingsOpen(true)}
      onSignOut={() => void signOut()}
      toasts={<Toast.Region />}
    >
      <Outlet />
      <Settings open={settingsOpen} onOpenChange={setSettingsOpen} />
    </AppLayout.Frame>
  );
}
