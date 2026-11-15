import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { useLanguage } from "../../lib/i18n";
import type { Language } from "../../lib/language";
import * as Popover from "./popover";

/** The demo idea and its explanation, in the toolbar’s language. They are the story’s content, not the popover’s. */
const TEXTS = {
  en: {
    idea: "The race",
    title: "What the race shows",
    body: "Each line is one member’s gain since the start of the period. The dashed end is today: it becomes final at the close.",
  },
  fr: {
    idea: "La course",
    title: "Ce que montre la course",
    body: "Chaque ligne est le gain d’un membre depuis le début de la période. La fin en pointillés, c’est aujourd’hui : elle devient définitive à la clôture.",
  },
} as const satisfies Record<Language, Record<string, string>>;

/** What the controls change: the popup's placement, its optional parts, and the help section it links to. */
interface PopoverArgs {
  side: NonNullable<Popover.PopupProps["side"]>;
  align: NonNullable<Popover.PopupProps["align"]>;
  title: boolean;
  helpLink: boolean;
  section: string;
  /** Opens the popover as the story loads, so the Docs page and the canvas show it open. */
  defaultOpen: boolean;
}

/** The ⓘ beside the race chart's heading, and its explanation. */
function InfoPopover({
  side,
  align,
  title,
  helpLink,
  section,
  defaultOpen,
}: PopoverArgs) {
  const text = TEXTS[useLanguage()];
  return (
    <div className="flex items-center gap-xs font-sans text-m font-semibold text-primary">
      {text.idea}
      <Popover.Root defaultOpen={defaultOpen}>
        <Popover.InfoTrigger label={text.title} />
        <Popover.Popup side={side} align={align}>
          {title ? <Popover.Title>{text.title}</Popover.Title> : null}
          <Popover.Description>{text.body}</Popover.Description>
          {helpLink ? <Popover.HelpLink section={section} /> : null}
        </Popover.Popup>
      </Popover.Root>
    </div>
  );
}

const DESCRIPTION = `
A short explanation that opens from the ⓘ beside an idea that needs a sentence, on Base UI’s popover: a title, one or two sentences, and a link to the section of How FPR works that explains it in full. Import it as a namespace: \`import * as Popover from "…/popover"\`.

| Part | What it is |
| --- | --- |
| \`Popover.Root\` | The popover’s state. \`defaultOpen\`, \`open\` and \`onOpenChange\` control it. |
| \`Popover.InfoTrigger\` | The small ⓘ icon button. \`label\` names the idea it explains for screen readers, usually the title. |
| \`Popover.Trigger\` | Any other trigger. \`render\` swaps in another element. |
| \`Popover.Popup\` | The floating card, in a portal, 280px wide. \`side\` and \`align\` place it beside the trigger: below it and centred on it by default. |
| \`Popover.Title\` | Its heading, which names it for screen readers. |
| \`Popover.Description\` | The sentences, read with the title. |
| \`Popover.HelpLink\` | “More in How FPR works”, to the section \`section\` names: \`race\` goes to \`/help#race\`. \`render\` composes it with the router’s link. |

- Base UI’s keyboard and screen-reader behaviour: the ⓘ opens it with a click, Enter, or Space, focus moves to the card, so a screen reader reads its title and sentences first, Tab reaches the link, and Escape or a click outside closes it and puts focus back on the ⓘ. It is a dialog named by its title and described by its sentences.
- Nothing opens by itself: the popover waits for the ⓘ.
- It fades and scales in from the ⓘ, without motion when the reader asks for less.

The popovers start open, so the look shows at once. The **Keyboard** story in the sidebar tests the keyboard, and the **Phone** and **Tablet** stories show the narrower widths.
`;

const meta = {
  title: "Molecules/Popover",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: DESCRIPTION },
      // Each story in its own frame, so the open popover doesn't cover the page.
      story: { inline: false, height: "16rem" },
    },
  },
  args: {
    side: "bottom",
    align: "center",
    title: true,
    helpLink: true,
    section: "race",
    defaultOpen: true,
  },
  argTypes: {
    side: {
      name: "Popover.Popup side",
      description: "The side of the ⓘ the popup opens on.",
      control: { type: "inline-radio" },
      options: ["bottom", "top", "left", "right"],
      table: { defaultValue: { summary: "bottom" } },
    },
    align: {
      name: "Popover.Popup align",
      description: "How the popup lines up with the ⓘ along that side.",
      control: { type: "inline-radio" },
      options: ["start", "center", "end"],
      table: { defaultValue: { summary: "center" } },
    },
    title: {
      name: "Popover.Title",
      description: "Renders the heading.",
      control: { type: "boolean" },
    },
    helpLink: {
      name: "Popover.HelpLink",
      description: "Renders the link to How FPR works.",
      control: { type: "boolean" },
    },
    section: {
      name: "Popover.HelpLink section",
      description: "The id of the How FPR works section the link goes to.",
      control: { type: "text" },
      if: { arg: "helpLink" },
    },
    defaultOpen: {
      name: "Popover.Root defaultOpen",
      description:
        "Opens the popover when it first renders. Applies when the story loads.",
      control: false,
    },
  },
  render: (args) => <InfoPopover {...args} />,
} satisfies Meta<PopoverArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The ⓘ beside the race chart’s heading, open: what the race shows, and its help section. */
export const Info: Story = {
  play: async ({ canvasElement, args }) => {
    const dialog = await within(canvasElement.ownerDocument.body).findByRole(
      "dialog",
      { name: "What the race shows" },
    );
    const link = within(dialog).getByRole("link", {
      name: "More in How FPR works",
    });
    await expect(link).toHaveAttribute("href", `/help#${args.section}`);
  },
};

/** The ⓘ opens it with Enter, Tab reaches its link, and Escape closes it, back on the ⓘ. */
export const Keyboard: Story = {
  tags: ["!autodocs"],
  args: { defaultOpen: false },
  play: async ({ canvasElement, step }) => {
    const page = within(canvasElement.ownerDocument.body);
    const trigger = within(canvasElement).getByRole("button", {
      name: "What the race shows",
    });

    await step("Enter opens it and focuses the card itself", async () => {
      trigger.focus();
      await userEvent.keyboard("{Enter}");
      const dialog = await page.findByRole("dialog", {
        name: "What the race shows",
      });
      await expect(dialog).toHaveAccessibleDescription(/Each line/);
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await waitFor(() => expect(dialog).toHaveFocus());
    });

    await step("Tab reaches the link to How FPR works", async () => {
      await userEvent.tab();
      await expect(
        within(page.getByRole("dialog")).getByRole("link", {
          name: "More in How FPR works",
        }),
      ).toHaveFocus();
    });

    await step("Escape closes it and focus goes back to the ⓘ", async () => {
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(page.queryByRole("dialog")).toBeNull());
      await expect(trigger).toHaveFocus();
    });
  },
};

/** The Docs page can't narrow a story, so the narrower widths live in the sidebar only. */
export const Phone: Story = {
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
};

export const Tablet: Story = {
  tags: ["!autodocs"],
  globals: { viewport: { value: "tablet" } },
};
