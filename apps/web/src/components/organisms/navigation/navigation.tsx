import { useRender } from "@base-ui/react/use-render";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/ArrowsClockwise";
import { ChartLineIcon } from "@phosphor-icons/react/ChartLine";
import { DotsThreeIcon } from "@phosphor-icons/react/DotsThree";
import { HouseIcon } from "@phosphor-icons/react/House";
import { UserGearIcon } from "@phosphor-icons/react/UserGear";
import { UsersThreeIcon } from "@phosphor-icons/react/UsersThree";
import { WalletIcon } from "@phosphor-icons/react/Wallet";
import { cva } from "class-variance-authority";
import {
  type ComponentProps,
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useId,
} from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import type { MemberColor } from "../../../lib/member-color";
import { Picture } from "../../atoms/picture/picture";
import { Icon, type IconProps } from "../../foundations/icon/icon";
import * as Menu from "../../molecules/menu/menu";

/** Who is signed in: it decides which items the navigation shows. */
export type Role = "admin" | "member" | "guest" | "anonymous";

/** A page the navigation has an item for. */
export type Destination =
  | "home"
  | "members"
  | "portfolio"
  | "shares"
  | "people"
  | "trackedShares";

/** A page the navigation links to: its items, and How FPR works in the account menu. */
export type LinkTarget = Destination | "help";

/** The path of each page the navigation links to. */
export const HREFS = {
  home: "/",
  members: "/members",
  portfolio: "/portfolio",
  shares: "/shares",
  people: "/admin/people",
  trackedShares: "/admin/shares",
  help: "/help",
} as const satisfies Record<LinkTarget, string>;

/** What `renderLink` receives for each link. */
export interface NavigationLink {
  target: LinkTarget;
  href: (typeof HREFS)[LinkTarget];
}

/**
 * The items a role sees: the four main ones, without Portfolio for guests and
 * anonymous viewers, then the admin area for the admin, and for anonymous
 * viewers, who read it without changing anything.
 */
export function destinationsFor(role: Role): {
  main: readonly Destination[];
  admin: readonly Destination[];
} {
  const portfolio = role === "admin" || role === "member";
  const adminArea = role === "admin" || role === "anonymous";
  return {
    main: portfolio
      ? ["home", "members", "portfolio", "shares"]
      : ["home", "members", "shares"],
    admin: adminArea ? ["people", "trackedShares"] : [],
  };
}

/** The signed-in person, as their picture shows them. */
export interface Account {
  /** Their display name, or an anonymous viewer's pseudonym. */
  name: string;
  /** Their colour. */
  color: MemberColor;
  /** Their photo's URL. An anonymous viewer has none. */
  photo?: string | null | undefined;
}

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
  /** The parts this navigation shows: `Side`, `TopBar`, `TabBar`, and the page between them. */
  children?: ReactNode;
}

type Context = Omit<RootProps, "children" | keyof NavigationIcons> & {
  icons: Record<Destination, IconProps["icon"]>;
  moreIcon: IconProps["icon"];
};

const NavigationContext = createContext<Context | null>(null);

function useNavigation(): Context {
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
function linkElement(
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

const item = cva(
  [
    "flex items-center bg-transparent font-medium text-secondary no-underline outline-none",
    "",
    "",
    "",
    "hover:bg-highlight hover:text-primary",
    "focus-visible:focus-ring",
    "current:bg-primary current:font-semibold current:text-on-primary",
  ],
  {
    variants: {
      // The rail on tablet and the sidebar on desktop are one list, laid out
      // per width; the side list is hidden on phone, where the tab bar is.
      place: {
        side: [
          "",
          "min-h-[3.5rem] flex-col justify-center gap-xs rounded-l px-[0.125rem] py-s text-xs",
          "tablet:min-h-[3.5rem] tablet:flex-col tablet:justify-center tablet:gap-xs tablet:rounded-l tablet:px-[0.125rem] tablet:py-s tablet:text-xs",
          "desktop:min-h-[0] desktop:rounded-full desktop:flex-row desktop:justify-start desktop:gap-[0.625rem] desktop:px-[0.75rem] desktop:py-s desktop:text-s",
        ],
        tab: "flex-1 flex-col justify-center gap-[0.125rem] rounded-full py-[0.375rem] text-xs",
      },
    },
  },
);

function Item({
  destination,
  place,
}: {
  destination: Destination;
  place: "side" | "tab";
}) {
  const { t } = useTranslation();
  const { current, renderLink, icons } = useNavigation();

  const isCurrent = current === destination;
  const link = useRender({
    render: linkElement(renderLink, destination),
    props: {
      className: item({ place }),
      "aria-current": isCurrent ? "page" : undefined,
      children: (
        <>
          <Icon
            icon={icons[destination]}
            size="m"
            weight={isCurrent ? "fill" : "regular"}
          />
          <span className="max-w-full text-center">
            {t(`navigation.items.${destination}`)}
          </span>
        </>
      ),
    },
  });

  return <li className={place === "tab" ? "flex flex-1" : "grid"}>{link}</li>;
}

/** Your picture, which opens the account menu: Settings, How FPR works, Sign out. */
function AccountMenu({ place }: { place: "side" | "top" }) {
  const { t } = useTranslation();
  const { account, renderLink, onSettings, onSignOut, moreIcon } =
    useNavigation();

  const side = place === "side";
  const label = t("navigation.account", { name: account.name });

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={side ? undefined : label}
        className={
          side
            ? cn(
                "flex cursor-pointer items-center rounded-full bg-transparent text-s font-medium text-primary",
                "size-xl justify-center gap-s self-center p-[0]",
                "tablet:size-xl tablet:justify-center tablet:gap-s tablet:self-center tablet:p-[0]",
                "desktop:h-auto desktop:w-full desktop:justify-start desktop:gap-s desktop:self-stretch desktop:px-[0.625rem] desktop:py-s",
                "hover:bg-highlight",
                "focus-visible:focus-ring",
                "popup-open:bg-highlight",
              )
            : cn(
                "inline-grid size-xl shrink-0 cursor-pointer place-items-center rounded-full bg-transparent",
                "",
                "",
                "",
                "focus-visible:focus-ring",
              )
        }
      >
        <Picture
          aria-hidden
          name={account.name}
          color={account.color}
          photo={account.photo ?? null}
          size="s"
        />
        {side ? (
          <>
            {/* Named by its content, so the name you see on desktop starts the name a screen reader hears. */}
            <span className="sr-only">{label}</span>
            <span
              aria-hidden
              className={cn(
                "min-w-0 flex-1 truncate text-start",
                "hidden",
                "tablet:hidden",
                "desktop:inline",
              )}
            >
              {account.name}
            </span>
            <Icon
              icon={moreIcon}
              size="m"
              className={cn(
                "text-secondary",
                "hidden",
                "tablet:hidden",
                "desktop:inline",
              )}
            />
          </>
        ) : null}
      </Menu.Trigger>
      <Menu.Popup side={side ? "top" : "bottom"} align={side ? "start" : "end"}>
        <Menu.Item onClick={onSettings}>{t("navigation.settings")}</Menu.Item>
        <Menu.LinkItem render={linkElement(renderLink, "help")}>
          {t("navigation.help")}
        </Menu.LinkItem>
        <Menu.Separator />
        <Menu.Item intent="danger" onClick={onSignOut}>
          {t("navigation.signOut")}
        </Menu.Item>
      </Menu.Popup>
    </Menu.Root>
  );
}

export type SideProps = ComponentProps<"nav">;

/**
 * The navigation beside the page: a rail on tablet, each icon above its name,
 * and a sidebar on desktop, each icon before its name. The account menu sits at
 * its bottom. Hidden on phone, where the tab bar and the top bar take its place.
 */
export function Side({ className, ...props }: SideProps) {
  const { t } = useTranslation();
  const { userRole } = useNavigation();
  const adminId = useId();

  const { main, admin } = destinationsFor(userRole);

  return (
    <nav
      aria-label={t("navigation.label")}
      {...props}
      className={cn(
        "sticky top-[0] h-dvh shrink-0 flex-col overflow-y-auto border-e-[1.5px] border-divider bg-page pb-[calc(var(--spacing-m)+env(safe-area-inset-bottom))] font-sans text-primary",
        "hidden",
        "tablet:flex tablet:w-[5.25rem] tablet:gap-xs tablet:px-s tablet:pt-[calc(var(--spacing-m)+env(safe-area-inset-top))]",
        "desktop:flex desktop:w-[12.5rem] desktop:gap-[0.125rem] desktop:px-[0.75rem] desktop:pt-[calc(1.125rem+env(safe-area-inset-top))]",
        className,
      )}
    >
      <p
        className={cn(
          "text-m font-semibold tracking-[0.08em]",
          "pb-[0.75rem] text-center",
          "tablet:px-[0] tablet:pb-[0.75rem] tablet:text-center",
          "desktop:px-[0.625rem] desktop:pb-[0.875rem] desktop:text-start",
        )}
      >
        {t("navigation.brand")}
      </p>
      <ul
        className={cn(
          "flex flex-col",
          "gap-xs",
          "tablet:gap-xs",
          "desktop:gap-[0.125rem]",
        )}
      >
        {main.map((destination) => (
          <Item key={destination} destination={destination} place="side" />
        ))}
      </ul>
      {admin.length > 0 ? (
        <>
          <p
            id={adminId}
            className={cn(
              "text-xs font-semibold text-secondary",
              "sr-only",
              "tablet:sr-only",
              "desktop:not-sr-only desktop:px-[0.75rem] desktop:pt-[0.875rem] desktop:pb-xs",
            )}
          >
            {t("navigation.admin")}
          </p>
          <ul
            aria-labelledby={adminId}
            className={cn(
              "flex flex-col border-divider",
              "mt-s gap-xs border-t-[1.5px] pt-s",
              "tablet:mt-s tablet:gap-xs tablet:border-t-[1.5px] tablet:pt-s",
              "desktop:mt-[0] desktop:gap-[0.125rem] desktop:border-t-0 desktop:pt-[0]",
            )}
          >
            {admin.map((destination) => (
              <Item key={destination} destination={destination} place="side" />
            ))}
          </ul>
        </>
      ) : null}
      <div
        className={cn(
          "mt-auto flex flex-col border-divider",
          "pt-s",
          "tablet:border-t-0 tablet:pt-s",
          "desktop:border-t-[1.5px] desktop:pt-s",
        )}
      >
        <AccountMenu place="side" />
      </div>
    </nav>
  );
}

export type TabBarProps = ComponentProps<"nav">;

/**
 * The phone's floating tab bar: a capsule 16px above the bottom edge and the
 * safe area, 80% white over a blur, opaque where the browser can't blur. The
 * page scrolls under it and leaves room for it at its end. Nothing floats
 * beside it. Hidden from tablet up.
 */
export function TabBar({ className, ...props }: TabBarProps) {
  const { t } = useTranslation();
  const { userRole } = useNavigation();

  const { main } = destinationsFor(userRole);

  return (
    <nav
      aria-label={t("navigation.label")}
      {...props}
      className={cn(
        "fixed inset-x-m bottom-[calc(var(--spacing-m)+env(safe-area-inset-bottom))] z-40 font-sans",
        "block",
        "tablet:hidden",
        "desktop:hidden",
        className,
      )}
    >
      <ul
        className={cn(
          "flex rounded-full bg-surface/80 p-[0.375rem] shadow-float backdrop-blur-[1.125rem] backdrop-saturate-[1.4]",
          "",
          "",
          "",
          "not-supports-[backdrop-filter:blur(0)]:bg-surface",
        )}
      >
        {main.map((destination) => (
          <Item key={destination} destination={destination} place="tab" />
        ))}
      </ul>
    </nav>
  );
}

interface TopBarOwnProps {
  /** The page's title or its back link, on the left. */
  title: ReactNode;
  /** Controls between the title and your picture, such as the period button. */
  children?: ReactNode;
}

export type TopBarProps = TopBarOwnProps &
  Omit<ComponentProps<"header">, keyof TopBarOwnProps>;

/**
 * The phone's top bar: the page's title or back link, then your picture,
 * which opens the account menu. It pads for the safe area at the top. Hidden
 * from tablet up, where the page bar and the side navigation take its place.
 */
export function TopBar({ title, children, className, ...props }: TopBarProps) {
  return (
    <header
      {...props}
      className={cn(
        "items-center gap-s pt-[env(safe-area-inset-top)] font-sans text-primary",
        "flex min-h-[calc(3.5rem+env(safe-area-inset-top))] px-m",
        "tablet:hidden",
        "desktop:hidden",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center text-l font-semibold">
        {title}
      </div>
      {children}
      <AccountMenu place="top" />
    </header>
  );
}
