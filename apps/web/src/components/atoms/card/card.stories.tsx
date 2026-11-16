import type { Meta, StoryObj } from "@storybook/react-vite";
import { useLanguage } from "../../../lib/i18n";
import type { Language } from "../../../lib/language";
import { Card } from "./card";

/** The demo texts, in the toolbar's language. They are the stories' content, not the card's. */
const TEXTS = {
  en: { title: "World Index ETF", body: "Its price, its curve and its value." },
  fr: { title: "World Index ETF", body: "Son cours, sa courbe et sa valeur." },
} as const satisfies Record<Language, Record<string, string>>;

function Content() {
  const text = TEXTS[useLanguage()];

  return (
    <>
      <p className="text-s font-semibold text-primary">{text.title}</p>
      <p className="text-xs text-secondary">{text.body}</p>
    </>
  );
}

const DESCRIPTION = `
A white card with large rounded corners, the ground every card of the app sits on: a holding, the standings, the focus panel.

- **elevation**: \`outline\` (the default) rests on the page with its divider line; \`rest\` lifts it with a soft shadow, as the first card under the sky.
- Its padding and layout come from the caller's \`className\`: each card sets its own.

It renders a \`<div>\` and takes every prop of one. \`render\` draws it as another element: \`<Card render={<article />}>\`.
`;

const meta = {
  title: "Atoms/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
  args: {
    elevation: "outline",
    className: "flex max-w-[20rem] flex-col gap-xs p-m",
  },
  argTypes: {
    elevation: {
      description:
        "`outline`, a card resting on the page with its divider line; `rest`, lifted by a soft shadow, as the first card under the sky.",
      control: { type: "inline-radio" },
      options: ["outline", "rest"],
      table: {
        type: { summary: '"outline" | "rest"' },
        defaultValue: { summary: "outline" },
      },
    },
    className: {
      description:
        "Classes added to the card's, which win any conflict: its padding and layout.",
      control: false,
    },
    render: {
      description:
        "Draws the card as another element, such as `<article />` or `<section />`.",
      control: false,
      table: { type: { summary: "ReactElement" } },
    },
  },
  render: (args) => (
    <Card {...args}>
      <Content />
    </Card>
  ),
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

/** One card, its elevation picked in the Controls panel. */
export const Playground: Story = {};

/** Both elevations side by side: the outline at rest on the page, and the soft shadow of the first card under the sky. */
export const Elevations: Story = {
  parameters: { controls: { disable: true } },
  render: (args) => (
    <div className="flex flex-wrap gap-m">
      <Card {...args} elevation="outline">
        <Content />
      </Card>
      <Card {...args} elevation="rest">
        <Content />
      </Card>
    </div>
  ),
};
