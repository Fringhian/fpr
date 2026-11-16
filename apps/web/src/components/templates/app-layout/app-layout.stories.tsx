import { roles } from "@fpr/contracts/values";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import {
  BasicPage,
  type LayoutArgs,
  PartsPage,
} from "./app-layout-story-pages";

const DESCRIPTION = `
The frame every everyday page sits in: Home, Members, a member, Portfolio, Shares, a share, How FPR works and the admin area. Import it as a namespace: \`import * as AppLayout from "…/app-layout"\`. \`AppLayout.Basic\` composes the common page from props, inside \`Navigation.Root\`; a page with a special need composes the parts.

| Part | What it is |
| --- | --- |
| \`AppLayout.Root\` | The frame, inside \`Navigation.Root\`: “Skip to content” first, then \`Navigation.Side\`, \`AppLayout.Main\` and \`Navigation.TabBar\` side by side. It pads the left and right safe areas of a phone held sideways. |
| \`AppLayout.Main\` | The page’s column, its \`<main>\`, which “Skip to content” leads to, on the page ground of \`Sky.Root\`. Its end clears the tab bar by \`--tab-bar-room\` on phone, 92px above the bottom safe area, and leaves 40px from tablet up. |
| \`AppLayout.CompactBar\` | \`PageBar.Compact\`, first in \`AppLayout.Main\`, outside the gutters, its title and controls lined up with the content. \`anchor\` is the same ref as the page’s \`PageBar.Root\`. |
| \`AppLayout.Content\` | The page bar and the page’s regions between the gutters, 16px on phone and 24px from tablet up, up to 1120px wide, centred in the column. On a page with a header sentence, \`Sky.Band\` comes before it and \`Sky.Header\` first in it. |

- **Desktop**, from 1120px: the sidebar, then the column; past 1120px of content, the content centres and the sky still spans the column.
- **Tablet**, from 640px: the rail, then the column.
- **Phone**: the page bar ends with your picture, and the floating tab bar holds the bottom edge. The page scrolls under it and its end clears it by 92px.
- **Safe areas**: \`index.html\` sets \`viewport-fit=cover\`, so an installed app draws under the notch and the home indicator. The page bar, the compact bar and the side navigation pad the top inset, the tab bar, the side navigation and the column’s end the bottom one, and the frame the left and right ones.
- **Keyboard**: “Skip to content” is the first stop, out of view until it has focus. It moves focus to the page’s \`<main>\`, past the navigation.

The controls set the role and the page, and switch the header sentence and the compact bar. Each story renders in its own frame and scrolls. The Docs page can’t narrow a story, so the **Phone** and **Tablet** stories live in the sidebar, and **Wide** shows the content centred at 1600px.
`;

const meta = {
  title: "Templates/App layout",
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
    header: true,
    compactBar: true,
  },
  argTypes: {
    userRole: {
      description:
        "Who is signed in. Guests and anonymous viewers have no Portfolio; the admin and anonymous viewers have the Admin group.",
      control: { type: "inline-radio" },
      options: roles,
    },
    current: {
      description:
        "The page you are on, its navigation item current. `none` for How FPR works, a page without an item.",
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
    header: {
      description:
        "Renders the header sentence on the sky, with the main card on the ridge. Off, the page starts on snow and the bar’s title is its heading.",
      control: { type: "boolean" },
    },
    compactBar: {
      description:
        "Renders the compact bar, which takes the page bar’s place at the top once it has scrolled past.",
      control: { type: "boolean" },
    },
  },
  render: (args) => <BasicPage {...args} />,
} satisfies Meta<LayoutArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Tabs to “Skip to content”, the first stop, which slides in `top` pixels
 * from the top, and follows it: the page’s `<main>` takes focus, and is
 * focusable only until focus leaves it.
 */
async function skipToContent(canvasElement: HTMLElement, top = 8) {
  const skip = within(canvasElement).getByRole("link", {
    name: "Skip to content",
  });
  const main = within(canvasElement).getByRole("main");
  await expect(main).not.toHaveAttribute("tabindex");
  await userEvent.tab();
  await expect(skip).toHaveFocus();
  await waitFor(() => expect(skip.getBoundingClientRect().top).toBe(top));
  await expect(skip).toHaveAttribute("href", `#${main.id}`);
  await userEvent.keyboard("{Enter}");
  await expect(main).toHaveFocus();
  main.blur();
  await expect(main).not.toHaveAttribute("tabindex");
}

/** The admin on Home: the sidebar with the Admin group, the sky and its sentence, and the main card on the ridge. */
export const Desktop: Story = {
  globals: { viewport: { value: "desktop" } },
  play: async ({ canvasElement }) => {
    await skipToContent(canvasElement);
    const nav = within(canvasElement).getAllByRole("navigation")[0];
    if (nav === undefined) throw new Error("No navigation");
    await expect(within(nav).getAllByRole("link")).toHaveLength(6);
  },
};

/** Past 1120px of content, it centres in the column, and the sky still spans the column. */
export const Wide: Story = {
  tags: ["!autodocs"],
  globals: { viewport: { value: "wide" } },
  play: async ({ canvasElement }) => {
    const main = within(canvasElement).getByRole("main");
    const content = main.querySelector("header")?.parentElement;
    if (!(content instanceof HTMLElement)) throw new Error("No content");
    const column = main.getBoundingClientRect();
    const box = content.getBoundingClientRect();
    const gutters =
      Number.parseFloat(getComputedStyle(content).paddingLeft) * 2;
    await expect(box.width - gutters).toBe(1120);
    await expect(box.left - column.left).toBe(column.right - box.right);
  },
};

/** A guest on Shares: no Portfolio and no Admin group, and a page without a header sentence, on snow. */
export const Guest: Story = {
  args: { userRole: "guest", current: "shares", header: false },
  globals: { viewport: { value: "desktop" } },
  play: async ({ canvasElement }) => {
    const nav = within(canvasElement).getAllByRole("navigation")[0];
    if (nav === undefined) throw new Error("No navigation");
    await expect(within(nav).getAllByRole("link")).toHaveLength(3);
    await expect(
      within(canvasElement).getByRole("heading", { level: 1, name: "Shares" }),
    ).toBeVisible();
  },
};

/** The admin’s People page, composed from the parts: no period, no header sentence. */
export const Parts: Story = {
  globals: { viewport: { value: "desktop" } },
  parameters: { controls: { disable: true } },
  render: () => <PartsPage />,
};

/** The rail, then the column. */
export const Tablet: Story = {
  tags: ["!autodocs"],
  globals: { viewport: { value: "tablet" } },
};

/** The page bar ending with your picture, and the floating tab bar, which the page’s end clears by 92px. */
export const Phone: Story = {
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const ground = canvas.getByRole("main").firstElementChild;
    const lastCard = [...canvasElement.querySelectorAll("section")].at(-1);
    const tabBar = canvas.getAllByRole("navigation").at(-1);
    if (!ground || !lastCard || !tabBar) throw new Error("No page");
    await expect(getComputedStyle(ground).paddingBottom).toBe("92px");
    window.scrollTo({ top: canvasElement.ownerDocument.body.scrollHeight });
    // At the page's end, the last card ends 92px above the bottom, clear of the tab bar.
    await waitFor(() =>
      expect(window.innerHeight - lastCard.getBoundingClientRect().bottom).toBe(
        92,
      ),
    );
    await expect(lastCard.getBoundingClientRect().bottom).toBeLessThan(
      tabBar.getBoundingClientRect().top,
    );
  },
};

/** A guest’s tab bar: three items, without Portfolio. */
export const PhoneGuest: Story = {
  name: "Phone, guest",
  tags: ["!autodocs"],
  args: { userRole: "guest", current: "members", header: false },
  globals: { viewport: { value: "phone" } },
};

/** A phone’s notch: 59px, the inset an installed app draws under. */
const NOTCH = 59;

/** Installed on a phone with a notch: the sky reaches under it, and the bar and “Skip to content” sit below it. */
export const PhoneInstalled: Story = {
  name: "Phone, installed",
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
  decorators: [
    (Story) => (
      <div style={{ "--safe-top": `${NOTCH}px` } as CSSProperties}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    await skipToContent(canvasElement, NOTCH + 8);
  },
};
