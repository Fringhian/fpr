import type { Language } from "@fpr/contracts";
import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/ArrowSquareOut";
import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useLanguage } from "../../../lib/i18n";
import { TextLink, type TextLinkProps } from "./text-link";

/** The icons `toPageIcon` offers, by name. */
const TO_PAGE_ICONS = {
  "caret-right": CaretRightIcon,
  "arrow-right": ArrowRightIcon,
  "arrow-square-out": ArrowSquareOutIcon,
} as const;

/** The story's args: the icon is picked by name in the Controls panel. */
type TextLinkArgs = Omit<TextLinkProps, "toPageIcon"> & {
  toPageIcon: keyof typeof TO_PAGE_ICONS;
};

/** The demo texts, in the toolbar's language. They are the stories' content, not the link's. */
const TEXTS = {
  en: {
    link: "Open Sam’s page",
    before: "Prices come from the markets every 30 minutes.",
    inSentence: "More in How FPR works",
    after: ", with every rule the race follows.",
  },
  fr: {
    link: "Ouvrir la page de Sam",
    before: "Les cours viennent des marchés toutes les 30 minutes.",
    inSentence: "Plus dans Comment marche FPR",
    after: ", avec chaque règle de la course.",
  },
} as const satisfies Record<Language, Record<string, string>>;

function Text({ text }: { text: keyof (typeof TEXTS)["en"] }) {
  return TEXTS[useLanguage()][text];
}

const DESCRIPTION = `
A link in the link colour, underlined so it never rests on colour alone. It takes the size of its text, and wraps inside a sentence.

- **toPage**: ends the link with \`toPageIcon\`, a caret by default: it goes to another page.

It renders an \`<a>\` and takes every prop of one. \`render\` composes it with the router’s link: \`<TextLink render={<Link to="/help" />}>\`.
`;

const meta = {
  title: "Atoms/Text link",
  component: TextLink,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
  args: { toPage: true, href: "#" },
  argTypes: {
    toPage: {
      description: "Ends the link with `toPageIcon`: it goes to another page.",
      control: { type: "boolean" },
      table: { defaultValue: { summary: "false" } },
    },
    toPageIcon: {
      description:
        "The icon `toPage` draws, any Phosphor icon: `toPageIcon={ArrowRightIcon}`.",
      options: Object.keys(TO_PAGE_ICONS),
      control: { type: "select" },
      if: { arg: "toPage" },
      table: { defaultValue: { summary: "CaretRightIcon" } },
    },
    href: { description: "Where the link goes.", control: false },
    children: { description: "The link’s words.", control: false },
    render: {
      description:
        "Base UI’s `render`: renders the link as another element, such as the router’s `Link`, keeping its look.",
      control: false,
    },
    className: {
      description: "Classes added to the link’s, which win any conflict.",
      control: false,
    },
  },
} satisfies Meta<typeof TextLink>;

export default meta;

type Story = StoryObj<TextLinkArgs>;

/** A link that goes to another page ends with a caret. */
export const ToAPage: Story = {
  args: { toPageIcon: "caret-right" },
  render: ({ toPageIcon, ...args }) => (
    <TextLink {...args} toPageIcon={TO_PAGE_ICONS[toPageIcon]}>
      <Text text="link" />
    </TextLink>
  ),
};

/** Inside a sentence it takes the text’s size and wraps with it. */
export const InASentence: Story = {
  args: { toPage: false, toPageIcon: "caret-right" },
  render: ({ toPageIcon, ...args }) => (
    <p className="max-w-[20rem] text-s text-secondary">
      <Text text="before" />{" "}
      <TextLink {...args} toPageIcon={TO_PAGE_ICONS[toPageIcon]}>
        <Text text="inSentence" />
      </TextLink>
      <Text text="after" />
    </p>
  ),
};
