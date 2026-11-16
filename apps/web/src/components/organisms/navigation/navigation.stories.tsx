import type { Role } from "@fpr/contracts";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/ArrowsClockwise";
import { ChartLineIcon } from "@phosphor-icons/react/ChartLine";
import { CompassIcon } from "@phosphor-icons/react/Compass";
import { DotsThreeIcon } from "@phosphor-icons/react/DotsThree";
import { HouseIcon } from "@phosphor-icons/react/House";
import { StarIcon } from "@phosphor-icons/react/Star";
import { UserGearIcon } from "@phosphor-icons/react/UserGear";
import { UsersThreeIcon } from "@phosphor-icons/react/UsersThree";
import { WalletIcon } from "@phosphor-icons/react/Wallet";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { cn } from "../../../lib/cn";
import { useLanguage } from "../../../lib/i18n";
import type { Language } from "../../../lib/language";
import {
  PeriodControl,
  type PeriodSetting,
} from "../../molecules/period-control/period-control";
import * as PageBar from "../page-bar/page-bar";
import * as Navigation from "./navigation";

/** The icons the Controls panel offers for each item, by name. */
const ICONS = {
  house: HouseIcon,
  "users-three": UsersThreeIcon,
  wallet: WalletIcon,
  "chart-line": ChartLineIcon,
  "user-gear": UserGearIcon,
  "arrows-clockwise": ArrowsClockwiseIcon,
  "dots-three": DotsThreeIcon,
  star: StarIcon,
  compass: CompassIcon,
} as const;

type IconName = keyof typeof ICONS;

const ICON_PROPS = [
  "homeIcon",
  "membersIcon",
  "portfolioIcon",
  "sharesIcon",
  "peopleIcon",
  "trackedSharesIcon",
  "moreIcon",
] as const;

type IconProp = (typeof ICON_PROPS)[number];

/** The signed-in person each role's stories show: invented names, and a pseudonym for the anonymous viewer, who has no photo. */
const ACCOUNTS = {
  admin: { name: "Alex", color: "cobalt" },
  member: { name: "Sam", color: "vermilion" },
  guest: { name: "Lea", color: "green" },
  anonymous: { name: "Quiet Otter", color: "lime" },
} as const satisfies Record<Role, Navigation.Account>;

/** The demo page's texts, in the toolbar’s language. They are the stories’ content, not the navigation’s. */
const TEXTS = {
  en: {
    card: "A card of the page",
    body: "The page scrolls under the floating tab bar and leaves room for it at its end.",
  },
  fr: {
    card: "Une carte de la page",
    body: "La page défile sous la barre d’onglets flottante et lui laisse de la place à la fin.",
  },
} as const satisfies Record<Language, Record<string, string>>;

/** What the controls change: Root's props, its icons picked by name, and a boolean per part. */
type NavigationArgs = Omit<
  Navigation.RootProps,
  IconProp | "account" | "current" | "children"
> &
  Record<IconProp, IconName> & {
    current: Navigation.Destination | "none";
    side: boolean;
    accountMenu: boolean;
    tabBar: boolean;
  };

/** The pages that show the period control. */
const PERIOD_PAGES: readonly (Navigation.Destination | "none")[] = [
  "home",
  "members",
  "portfolio",
  "shares",
];

/**
 * The demo page's bar: its title, or with `back` a link to the current item's
 * page, then the period on the pages that show it, and the account menu.
 */
function Bar({
  current,
  anonymous,
  accountMenu,
  back,
}: {
  current: Navigation.Destination | "none";
  anonymous: boolean;
  accountMenu: boolean;
  back: boolean;
}) {
  const { t } = useTranslation();
  const [setting, setSetting] = useState<PeriodSetting>({
    period: "1M",
    unit: "percent",
  });

  // How FPR works is a page without an item.
  const title =
    current === "none"
      ? t("navigation.help")
      : t(`navigation.items.${current}`);

  return (
    <PageBar.Root>
      {back && current !== "none" ? (
        <PageBar.Back href={Navigation.HREFS[current]}>{title}</PageBar.Back>
      ) : (
        <PageBar.Title render={(titleProps) => <h1 {...titleProps} />}>
          {title}
        </PageBar.Title>
      )}
      <PageBar.Controls>
        {PERIOD_PAGES.includes(current) ? (
          <PeriodControl
            value={setting}
            onChange={setSetting}
            backdrop="snow"
            anonymous={anonymous}
          />
        ) : null}
        {accountMenu ? <Navigation.AccountMenu /> : null}
      </PageBar.Controls>
    </PageBar.Root>
  );
}

function Cards() {
  const text = TEXTS[useLanguage()];

  return [1, 2, 3, 4, 5, 6, 7].map((card) => (
    <article
      key={card}
      className="grid gap-xs rounded-l bg-surface p-m shadow-outline"
    >
      <h2 className="text-m font-semibold">{text.card}</h2>
      <p className="text-s text-secondary">{text.body}</p>
    </article>
  ));
}

/**
 * A page laid out with the parts the controls switch on: the side navigation,
 * the account menu in the page bar, the tab bar. With `back`, the page sits
 * under the current one, and its bar leads with a back link to it.
 */
function AppFrame({
  current,
  side,
  accountMenu,
  tabBar,
  back = false,
  ...props
}: NavigationArgs & { back?: boolean }) {
  return (
    <Navigation.Root
      {...props}
      account={ACCOUNTS[props.userRole]}
      current={current === "none" ? undefined : current}
      {...iconsOf(props)}
    >
      <div className="flex font-sans text-primary">
        {side ? <Navigation.Side /> : null}
        <main
          className={cn(
            "grid min-w-0 flex-1 content-start gap-m",
            "px-m pb-[calc(6rem+env(safe-area-inset-bottom))]",
            "tablet:px-l tablet:pb-l",
            "desktop:px-l desktop:pb-l",
          )}
        >
          <Bar
            current={current}
            anonymous={props.userRole === "anonymous"}
            accountMenu={accountMenu}
            back={back}
          />
          <Cards />
        </main>
        {tabBar ? <Navigation.TabBar /> : null}
      </div>
    </Navigation.Root>
  );
}

/** Root's icon props, from the names the controls pick. */
function iconsOf(names: Record<IconProp, IconName>) {
  return {
    homeIcon: ICONS[names.homeIcon],
    membersIcon: ICONS[names.membersIcon],
    portfolioIcon: ICONS[names.portfolioIcon],
    sharesIcon: ICONS[names.sharesIcon],
    peopleIcon: ICONS[names.peopleIcon],
    trackedSharesIcon: ICONS[names.trackedSharesIcon],
    moreIcon: ICONS[names.moreIcon],
  };
}

const DESCRIPTION = `
The app’s navigation: a sidebar on desktop, a rail on tablet, and on phone a floating tab bar, with the account menu at the end of the page bar. Import it as a namespace: \`import * as Navigation from "…/navigation"\`.

| Part | What it is |
| --- | --- |
| \`Navigation.Root\` | Holds what every part reads: \`userRole\`, \`current\`, \`account\`, \`renderLink\`, \`onSettings\`, \`onSignOut\`, and each item’s icon. It renders no element. |
| \`Navigation.Side\` | The rail on tablet, each icon above its name, and the sidebar on desktop, each icon before its name, with the account menu at its bottom. Hidden on phone. |
| \`Navigation.AccountMenu\` | Your picture, last in \`PageBar.Controls\`, which opens the account menu as a sheet. Phone only: from tablet up, the side navigation holds the menu. A 44px target. |
| \`Navigation.TabBar\` | The phone’s floating tab bar: a capsule 16px above the bottom edge and the safe area, 80% white over a blur, opaque where the browser can’t blur. Nothing floats beside it. Hidden from tablet up. |

- **Items**: Home, Members, Portfolio and Shares, then an Admin group with People and Tracked shares. Guests and anonymous viewers have no Portfolio. The admin has the Admin group, and so do anonymous viewers, who read the admin area without changing anything. The admin area works on tablet and desktop, so the tab bar never shows it. \`destinationsFor(role)\` returns the items a role sees.
- **Current item**: charcoal, its icon filled, with \`aria-current="page"\`. \`current\` names it; a page without an item, such as How FPR works, has none.
- **Links**: plain \`<a href>\` by default. \`renderLink\` returns the router’s link for each one, \`({ href }) => <Link to={href} />\`, and the item’s classes, \`aria-current\` and content are merged into it. \`HREFS\` holds each page’s path.
- **Account menu**: your picture, with your name on the desktop sidebar, opens Settings, How FPR works, and Sign out. It sits at the bottom of the sidebar and the rail, and at the end of the page bar on phone, so a page has one bar at every width.
- **Icons**: each item’s icon is a prop of \`Navigation.Root\`, any Phosphor icon, with the design’s icon by default.

Every story here renders in its own frame at the page’s own width. The **Tablet** and **Phone** stories in the sidebar show the narrower widths, and the viewport menu switches any story.
`;

const iconControl = (fallback: IconName, description: string) => ({
  description,
  options: Object.keys(ICONS),
  control: { type: "select" as const },
  table: { defaultValue: { summary: fallback } },
});

const meta = {
  title: "Organisms/Navigation",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: { component: DESCRIPTION },
      story: { inline: false, height: "40rem" },
    },
  },
  args: {
    userRole: "admin",
    current: "home",
    side: true,
    accountMenu: true,
    tabBar: true,
    homeIcon: "house",
    membersIcon: "users-three",
    portfolioIcon: "wallet",
    sharesIcon: "chart-line",
    peopleIcon: "user-gear",
    trackedSharesIcon: "arrows-clockwise",
    moreIcon: "dots-three",
  },
  argTypes: {
    userRole: {
      description:
        "Who is signed in. Guests and anonymous viewers have no Portfolio; the admin and anonymous viewers have the Admin group.",
      control: { type: "inline-radio" },
      options: ["admin", "member", "guest", "anonymous"],
    },
    current: {
      description:
        "The page you are on: its item is charcoal with its icon filled. `none` for a page without an item.",
      control: { type: "select" },
      options: [
        "home",
        "members",
        "portfolio",
        "shares",
        "people",
        "trackedShares",
        "none",
      ],
    },
    homeIcon: iconControl("house", "Home’s icon."),
    membersIcon: iconControl("users-three", "Members’ icon."),
    portfolioIcon: iconControl("wallet", "Portfolio’s icon."),
    sharesIcon: iconControl("chart-line", "Shares’ icon."),
    peopleIcon: iconControl("user-gear", "People’s icon, in the Admin group."),
    trackedSharesIcon: iconControl(
      "arrows-clockwise",
      "Tracked shares’ icon, in the Admin group.",
    ),
    moreIcon: iconControl(
      "dots-three",
      "The icon after your name on the sidebar’s account button.",
    ),
    side: {
      name: "Navigation.Side",
      description: "Renders the rail on tablet and the sidebar on desktop.",
      control: { type: "boolean" },
    },
    accountMenu: {
      name: "Navigation.AccountMenu",
      description:
        "Renders your picture at the end of the page bar, on phone only.",
      control: { type: "boolean" },
    },
    tabBar: {
      name: "Navigation.TabBar",
      description: "Renders the phone’s floating tab bar.",
      control: { type: "boolean" },
    },
    renderLink: {
      description:
        "Renders each link, such as the router’s: `({ href }) => <Link to={href} />`. The stories use plain links.",
      control: false,
    },
    onSettings: {
      description: "Runs when Settings is chosen in the account menu.",
      control: false,
    },
    onSignOut: {
      description: "Runs when Sign out is chosen in the account menu.",
      control: false,
    },
  },
  render: (args) => <AppFrame {...args} />,
} satisfies Meta<NavigationArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The admin on Home: every item, and the Admin group. */
export const Admin: Story = {
  globals: { viewport: { value: "desktop" } },
  play: async ({ canvasElement }) => {
    const nav = within(canvasElement).getAllByRole("navigation")[0];
    if (nav === undefined) throw new Error("No navigation");
    const current = within(nav).getByRole("link", { current: "page" });
    await expect(current).toHaveAttribute("href", "/");
    await expect(within(nav).getAllByRole("link")).toHaveLength(6);
  },
};

/** A member on Members: the four items, no Admin group. */
export const Member: Story = {
  args: { userRole: "member", current: "members" },
  globals: { viewport: { value: "desktop" } },
};

/** A guest has no Portfolio and no Admin group. */
export const Guest: Story = {
  args: { userRole: "guest", current: "shares" },
  globals: { viewport: { value: "desktop" } },
  play: async ({ canvasElement }) => {
    const nav = within(canvasElement).getAllByRole("navigation")[0];
    if (nav === undefined) throw new Error("No navigation");
    await expect(within(nav).getAllByRole("link")).toHaveLength(3);
    await expect(
      within(nav).queryByRole("link", { name: "Portfolio" }),
    ).toBeNull();
  },
};

/** An anonymous viewer has no Portfolio, and reads the admin area: the Admin group shows. Their picture is their pseudonym’s initial. */
export const Anonymous: Story = {
  args: { userRole: "anonymous", current: "people" },
  globals: { viewport: { value: "desktop" } },
};

/** The account menu, opened from your picture at the bottom of the sidebar. */
export const AccountMenu: Story = {
  name: "Account menu",
  globals: { viewport: { value: "desktop" } },
  play: async ({ canvasElement, step }) => {
    const page = within(canvasElement.ownerDocument.body);
    // The page bar's account button is hidden from tablet up: one shows.
    const trigger = within(canvasElement).getByRole("button", {
      name: "Alex, your account",
    });
    await step("Your picture opens the menu", async () => {
      await userEvent.click(trigger);
      const menu = await page.findByRole("menu");
      const items = within(menu).getAllByRole("menuitem");
      await expect(items.map((item) => item.textContent)).toEqual([
        "Settings",
        "How FPR works",
        "Sign out",
      ]);
      await expect(items[1]).toHaveAttribute("href", "/help");
    });
  },
};

/** The rail: each icon above its name, the Admin group after a line, your picture at the bottom. */
export const Tablet: Story = {
  tags: ["!autodocs"],
  globals: { viewport: { value: "tablet" } },
};

/** The page bar ending with your picture, and the floating tab bar. The admin area isn’t on phone, so the tab bar has the four main items. */
export const Phone: Story = {
  tags: ["!autodocs"],
  args: { current: "members" },
  globals: { viewport: { value: "phone" } },
};

/** A member’s page, under Members: the page bar leads with `PageBar.Back`, a 44px target, in place of the title. */
export const PhoneBackLink: Story = {
  name: "Phone, back link",
  tags: ["!autodocs"],
  args: { current: "members" },
  globals: { viewport: { value: "phone" } },
  render: (args) => <AppFrame {...args} back />,
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("link", { name: "Back to Members" }),
    ).toHaveAttribute("href", "/members");
  },
};

/** A guest’s tab bar: three items, without Portfolio. */
export const PhoneGuest: Story = {
  name: "Phone, guest",
  tags: ["!autodocs"],
  args: { userRole: "guest", current: "home" },
  globals: { viewport: { value: "phone" } },
};

/** An anonymous viewer’s rail: no Portfolio, and the Admin group to read. */
export const TabletAnonymous: Story = {
  name: "Tablet, anonymous",
  tags: ["!autodocs"],
  args: { userRole: "anonymous", current: "trackedShares" },
  globals: { viewport: { value: "tablet" } },
};

/** The account menu from the end of the page bar, as a sheet rising from the bottom. On phone, the only account button is there. */
export const PhoneAccountMenu: Story = {
  name: "Phone, account menu",
  tags: ["!autodocs"],
  args: { userRole: "member", current: "home" },
  globals: { viewport: { value: "phone" } },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Sam, your account" }),
    );
    const sheet = await page.findByRole("dialog", {
      name: "Sam, your account",
    });
    await waitFor(() =>
      expect(
        within(sheet).getByRole("button", { name: "Sign out" }),
      ).toBeVisible(),
    );
  },
};
