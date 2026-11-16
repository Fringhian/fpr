import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import * as Toast from "../../components/molecules/toast/toast";
import * as Navigation from "../../components/organisms/navigation/navigation";
import * as AppLayout from "../../components/templates/app-layout/app-layout";
import { memberColor } from "../../lib/member-color";
import { signOut } from "../../lib/session/sign-out";
import { useSession } from "../../lib/session/use-session";

const renderLink = ({ href }: Navigation.NavigationLink) => <Link to={href} />;

/**
 * The frame every everyday page shares, kept while the person moves between
 * them: the navigation for their role, its current item read from the
 * address, the page in the column, and the toasts' region. Each page renders
 * its own `Screen`.
 */
export function AppShell() {
  const { person, role } = useSession();
  const current = useRouterState({
    select: (state) => Navigation.destinationAt(state.location.pathname),
  });

  return (
    <Navigation.Root
      userRole={role}
      current={current}
      account={{
        name: person.displayName,
        color: memberColor(person.color),
        photo: person.avatarUrl,
      }}
      renderLink={renderLink}
      onSignOut={() => void signOut()}
    >
      <AppLayout.Root>
        <Navigation.Side />
        <AppLayout.Main>
          <Outlet />
        </AppLayout.Main>
        <Navigation.TabBar />
      </AppLayout.Root>
      <Toast.Region />
    </Navigation.Root>
  );
}
