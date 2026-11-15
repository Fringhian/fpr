import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { DotsThreeIcon } from "@phosphor-icons/react/DotsThree";
import { DotsThreeVerticalIcon } from "@phosphor-icons/react/DotsThreeVertical";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { cn } from "../../lib/cn";
import { useLanguage } from "../../lib/i18n";
import type { Language } from "../../lib/language";
import * as Menu from "./menu";

/** The demo items and names, in the toolbar’s language. They are the stories’ content, not the menu’s. */
const TEXTS = {
  en: {
    person: "Sam",
    role: "Member",
    edit: "Edit",
    editPortfolio: "Edit portfolio",
    replaceLink: "Replace link",
    delete: "Delete",
    account: "Your account",
    settings: "Settings",
    help: "How FPR works",
    signOut: "Sign out",
  },
  fr: {
    person: "Sam",
    role: "Membre",
    edit: "Modifier",
    editPortfolio: "Modifier le portefeuille",
    replaceLink: "Remplacer le lien",
    delete: "Supprimer",
    account: "Votre compte",
    settings: "Réglages",
    help: "Comment fonctionne FPR",
    signOut: "Se déconnecter",
  },
} as const satisfies Record<Language, Record<string, string>>;

/** The icons the more-actions button offers, by name. */
const MORE_ICONS = {
  "dots-three": DotsThreeIcon,
  "dots-three-vertical": DotsThreeVerticalIcon,
  "caret-down": CaretDownIcon,
} as const;

/** What the controls change: the popup's placement, whether the separator is drawn, and the more-actions button's icon. */
interface MenuArgs {
  side: NonNullable<Menu.PopupProps["side"]>;
  align: NonNullable<Menu.PopupProps["align"]>;
  separator: boolean;
  moreIcon: keyof typeof MORE_ICONS;
  /** Opens the menu as the story loads, so the Docs page and the canvas show it open. */
  defaultOpen: boolean;
}

/** The more-actions menu of a person's row in the admin area, its danger item last. */
function MoreActions({
  side,
  align,
  separator,
  moreIcon,
  defaultOpen,
}: MenuArgs) {
  const text = TEXTS[useLanguage()];

  return (
    <div className="flex max-w-[24rem] items-center justify-between gap-s rounded-m bg-surface py-s ps-m pe-s font-sans shadow-outline">
      <div className="grid">
        <span className="text-s font-semibold text-primary">{text.person}</span>
        <span className="text-xs text-secondary">{text.role}</span>
      </div>
      <Menu.Root defaultOpen={defaultOpen}>
        <Menu.MoreTrigger subject={text.person} icon={MORE_ICONS[moreIcon]} />
        <Menu.Popup side={side} align={align}>
          <Menu.Item>{text.edit}</Menu.Item>
          <Menu.Item>{text.editPortfolio}</Menu.Item>
          <Menu.Item>{text.replaceLink}</Menu.Item>
          {separator ? <Menu.Separator /> : null}
          <Menu.Item intent="danger">{text.delete}</Menu.Item>
        </Menu.Popup>
      </Menu.Root>
    </div>
  );
}

/** The account menu, opened from your picture: Settings, How FPR works, Sign out. */
function Account({ side, align, separator, defaultOpen }: MenuArgs) {
  const text = TEXTS[useLanguage()];

  return (
    <div className="flex max-w-[24rem] justify-end font-sans">
      <Menu.Root defaultOpen={defaultOpen}>
        <Menu.Trigger
          aria-label={text.account}
          className={cn(
            "inline-grid size-xl cursor-pointer place-items-center rounded-full bg-cobalt-pastel text-s font-semibold text-primary",
            "",
            "",
            "",
            "focus-visible:focus-ring",
          )}
        >
          A
        </Menu.Trigger>
        <Menu.Popup side={side} align={align}>
          <Menu.Item>{text.settings}</Menu.Item>
          <Menu.LinkItem href="/help">{text.help}</Menu.LinkItem>
          {separator ? <Menu.Separator /> : null}
          <Menu.Item intent="danger">{text.signOut}</Menu.Item>
        </Menu.Popup>
      </Menu.Root>
    </div>
  );
}

const DESCRIPTION = `
A list of actions that opens from a button: the ⋯ menu of a card or a row, and the account menu opened from your picture. From tablet up, a popup beside its trigger, on Base UI’s menu; on phone, a sheet rising from the bottom, on the dialog. The menu checks the width itself: the same parts give both. Import it as a namespace: \`import * as Menu from "…/menu"\`.

| Part | What it is |
| --- | --- |
| \`Menu.Root\` | The menu’s state. \`defaultOpen\`, \`open\` and \`onOpenChange\` control it. It picks the popup or the sheet. |
| \`Menu.Trigger\` | The button that opens it, such as your picture. \`render\` swaps in another element. |
| \`Menu.MoreTrigger\` | The more-actions icon button, three dots by default; \`icon\` takes any Phosphor icon. \`subject\` names what it acts on for screen readers: “More actions for Sam”. |
| \`Menu.Popup\` | The list. From tablet up, floating in a portal: \`side\` and \`align\` place it beside the trigger, below it and aligned to its end by default. On phone, the sheet, named by its trigger, with Cancel under the items. |
| \`Menu.Item\` | An action. \`intent="danger"\` writes it in red, for deleting, revoking, or signing out. |
| \`Menu.LinkItem\` | An item that goes to another page, such as How FPR works. \`render\` composes it with the router’s link. |
| \`Menu.Separator\` | A line between groups, such as before the danger item. |

- The popup has Base UI’s keyboard and screen-reader behaviour: Enter, Space or the down arrow opens the menu on its first item, the arrows and Home and End move through the items, typing a letter jumps to an item, Enter chooses one, and Escape closes the menu and puts focus back on its trigger.
- The sheet is a dialog of buttons, each at least 48px tall: choosing one, Cancel, Escape or a tap on the dimmed page closes it.
- The item under the pointer, the arrow keys or a finger has the highlight tint. The danger item goes last, after a separator.
- The popup fades and scales in from its trigger, the sheet rises; with reduced motion, neither moves.

The menus start open, so the look shows at once. The **Keyboard** story in the sidebar tests the keyboard, the **Phone** story tests the sheet, and the **Tablet** story shows the popup at that width.
`;

const meta = {
  title: "Molecules/Menu",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: DESCRIPTION },
      // Each story in its own frame, so the open menus don't cover each other.
      story: { inline: false, height: "18rem" },
    },
  },
  args: {
    side: "bottom",
    align: "end",
    separator: true,
    moreIcon: "dots-three",
    defaultOpen: true,
  },
  argTypes: {
    moreIcon: {
      name: "Menu.MoreTrigger icon",
      description:
        "The more-actions button’s `icon`: any Phosphor icon, three dots by default.",
      options: Object.keys(MORE_ICONS),
      control: { type: "select" },
    },
    side: {
      name: "Menu.Popup side",
      description: "The side of the trigger the popup opens on.",
      control: { type: "inline-radio" },
      options: ["bottom", "top", "left", "right"],
      table: { defaultValue: { summary: "bottom" } },
    },
    align: {
      name: "Menu.Popup align",
      description: "How the popup lines up with the trigger along that side.",
      control: { type: "inline-radio" },
      options: ["start", "center", "end"],
      table: { defaultValue: { summary: "end" } },
    },
    separator: {
      name: "Menu.Separator",
      description: "Draws the line before the danger item.",
      control: { type: "boolean" },
    },
    defaultOpen: {
      name: "Menu.Root defaultOpen",
      description:
        "Opens the menu when it first renders. Applies when the story loads.",
      control: false,
    },
  },
  render: (args) => <MoreActions {...args} />,
} satisfies Meta<MenuArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The ⋯ menu of a person’s row, with its danger item last. */
export const MoreActionsMenu: Story = {
  name: "More actions",
};

/** The account menu, opened from your picture. How FPR works is a link item. */
export const AccountMenu: Story = {
  name: "Account",
  argTypes: { moreIcon: { table: { disable: true } } },
  render: (args) => <Account {...args} />,
};

/** The keyboard opens the menu on its first item, the arrows move through it, and Escape closes it, back on the trigger. */
export const Keyboard: Story = {
  tags: ["!autodocs"],
  args: { defaultOpen: false },
  play: async ({ canvasElement, step }) => {
    const page = within(canvasElement.ownerDocument.body);
    const trigger = within(canvasElement).getByRole("button", {
      name: "More actions for Sam",
    });
    await expect(trigger).toHaveAttribute("aria-haspopup", "menu");

    await step("Enter opens the menu on its first item", async () => {
      trigger.focus();
      await userEvent.keyboard("{Enter}");
      const menu = await page.findByRole("menu");
      const items = within(menu).getAllByRole("menuitem");
      await expect(items).toHaveLength(4);
      await waitFor(() => expect(items[0]).toHaveFocus());
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
    });

    await step("The arrows and End move through the items", async () => {
      const items = within(page.getByRole("menu")).getAllByRole("menuitem");
      await userEvent.keyboard("{ArrowDown}");
      await expect(items[1]).toHaveFocus();
      await userEvent.keyboard("{End}");
      await expect(items[3]).toHaveFocus();
      await expect(items[3]).toHaveTextContent("Delete");
      await userEvent.keyboard("{ArrowUp}");
      await expect(items[2]).toHaveFocus();
    });

    await step("Escape closes it and focus goes back to ⋯", async () => {
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(page.queryByRole("menu")).toBeNull());
      await expect(trigger).toHaveFocus();
    });

    await step("The down arrow opens it too", async () => {
      await userEvent.keyboard("{ArrowDown}");
      const menu = await page.findByRole("menu");
      await waitFor(() =>
        expect(within(menu).getAllByRole("menuitem")[0]).toHaveFocus(),
      );
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(page.queryByRole("menu")).toBeNull());
    });
  },
};

/** On phone, a sheet named by its trigger: the items as buttons, then Cancel. Choosing an item closes it. The Docs page can't narrow a story, so it lives in the sidebar only. */
export const Phone: Story = {
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
  play: async ({ canvasElement, step }) => {
    const page = within(canvasElement.ownerDocument.body);
    // The open sheet is modal: the page behind, its trigger included, is hidden from screen readers.
    const trigger = within(canvasElement).getByRole("button", {
      name: "More actions for Sam",
      hidden: true,
    });

    await step("The sheet lists the items, then Cancel", async () => {
      const sheet = await page.findByRole("dialog", {
        name: "More actions for Sam",
      });
      await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
      await expect(page.queryByRole("menu")).toBeNull();
      const buttons = within(sheet).getAllByRole("button");
      await expect(buttons.map((button) => button.textContent)).toEqual([
        "Edit",
        "Edit portfolio",
        "Replace link",
        "Delete",
        "Cancel",
      ]);
    });

    await step("Choosing an item closes it", async () => {
      await userEvent.click(page.getByRole("button", { name: "Edit" }));
      await waitFor(() => expect(page.queryByRole("dialog")).toBeNull());
    });

    await step("The ⋯ opens it again", async () => {
      await userEvent.click(trigger);
      await expect(
        await page.findByRole("dialog", { name: "More actions for Sam" }),
      ).toBeVisible();
    });
  },
};

export const Tablet: Story = {
  tags: ["!autodocs"],
  globals: { viewport: { value: "tablet" } },
};
