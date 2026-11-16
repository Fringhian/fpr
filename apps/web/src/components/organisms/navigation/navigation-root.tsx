import { ArrowsClockwiseIcon } from "@phosphor-icons/react/ArrowsClockwise";
import { ChartLineIcon } from "@phosphor-icons/react/ChartLine";
import { DotsThreeIcon } from "@phosphor-icons/react/DotsThree";
import { HouseIcon } from "@phosphor-icons/react/House";
import { UserGearIcon } from "@phosphor-icons/react/UserGear";
import { UsersThreeIcon } from "@phosphor-icons/react/UsersThree";
import { WalletIcon } from "@phosphor-icons/react/Wallet";
import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
} from "react";
import type { IconProps } from "../../foundations/icon/icon";
import {
  type Account,
  type Destination,
  HREFS,
  type LinkTarget,
  type NavigationLink,
  type Role,
} from "./navigation-model";

/** Each item's icon, any Phosphor icon. The current item draws its fill weight. */
interface NavigationIcons {
  /** Home's icon. A house by default. */
  homeIcon?: IconProps["icon"] | undefined;
  /** Members' icon. Three people by default. */
  membersIcon?: IconProps["icon"] | undefined;
  /** Portfolio's icon. A wallet by default. */
  portfolioIcon?: IconProps["icon"] | undefined;
  /** Shares' icon. A line chart by default. */
  sharesIcon?: IconProps["icon"] | undefined;
  /** People's icon, in the admin group. A person with a gear by default. */
  peopleIcon?: IconProps["icon"] | undefined;
  /** Tracked shares' icon, in the admin group. Two circling arrows by default. */
  trackedSharesIcon?: IconProps["icon"] | undefined;
  /** The icon after your name on the sidebar's account button. Three dots by default. */
  moreIcon?: IconProps["icon"] | undefined;
}

export interface RootProps extends NavigationIcons {
  /** Who is signed in. Guests and anonymous viewers have no Portfolio; the admin and anonymous viewers have the admin group. */
  userRole: Role;
  /** The page you are on: its item is charcoal, with its icon filled, and `aria-current="page"`. None on a page without an item, such as How FPR works. */
  current?: Destination | undefined;
  /** The signed-in person, whose picture opens the account menu. */
  account: Account;
  /**
   * Renders each link, so the router's link can take the place of the plain
   * `<a href>`: `({ href }) => <Link to={href} />`. The item's classes,
   * `aria-current` and content are merged into the element it returns.
   */
  renderLink?: ((link: NavigationLink) => ReactElement) | undefined;
  /** Runs when Settings is chosen in the account menu. */
  onSettings?: (() => void) | undefined;
  /** Runs when Sign out is chosen in the account menu. */
  onSignOut?: (() => void) | undefined;
  /** The page, with the parts it shows: `Side`, `TabBar`, and `AccountMenu` in its page bar. */
  children?: ReactNode;
}

type Context = Omit<RootProps, "children" | keyof NavigationIcons> & {
  icons: Record<Destination, IconProps["icon"]>;
  moreIcon: IconProps["icon"];
};

const NavigationContext = createContext<Context | null>(null);

export function useNavigation(): Context {
  const context = useContext(NavigationContext);
  if (context === null) {
    throw new Error("A navigation part renders inside Navigation.Root");
  }
  return context;
}

/**
 * Holds what every part reads: the role, the current page, the account, how
 * links render, and the account menu's actions. It renders no element.
 */
export function Root({
  homeIcon = HouseIcon,
  membersIcon = UsersThreeIcon,
  portfolioIcon = WalletIcon,
  sharesIcon = ChartLineIcon,
  peopleIcon = UserGearIcon,
  trackedSharesIcon = ArrowsClockwiseIcon,
  moreIcon = DotsThreeIcon,
  children,
  ...props
}: RootProps) {
  const value: Context = {
    ...props,
    icons: {
      home: homeIcon,
      members: membersIcon,
      portfolio: portfolioIcon,
      shares: sharesIcon,
      people: peopleIcon,
      trackedShares: trackedSharesIcon,
    },
    moreIcon,
  };

  return <NavigationContext value={value}>{children}</NavigationContext>;
}

/** The plain link, or the one `renderLink` returns, for a target. */
export function linkElement(
  renderLink: Context["renderLink"],
  target: LinkTarget,
): ReactElement {
  const href = HREFS[target];
  return renderLink ? (
    renderLink({ target, href })
  ) : (
    // biome-ignore lint/a11y/useAnchorContent: useRender merges the item's icon and name into it.
    <a href={href} />
  );
}
