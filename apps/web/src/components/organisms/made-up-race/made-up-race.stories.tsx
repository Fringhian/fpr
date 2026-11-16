import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "../../atoms/card/card";
import { MadeUpRace } from "./made-up-race";

const DESCRIPTION = `
The race with seven invented members over the last 22 weekdays, in percent, with “You” in colour: what FPR shows before sign-in, in the sky panel on desktop and in a card above the form on tablet. It is the race card’s chart on invented data, built afresh on each load from the day’s date, so it never shows real data. Nothing in it is selectable.

On this page the story renders at the page’s own width, a desktop width: the **Tablet** story in the sidebar shows the narrower one.
`;

const meta = {
  title: "Organisms/Made-up race",
  component: MadeUpRace,
  tags: ["autodocs"],
  parameters: {
    controls: { disable: true },
    docs: { description: { component: DESCRIPTION } },
  },
  render: () => (
    <Card elevation="rest" className="max-w-[32.5rem] p-l">
      <MadeUpRace />
    </Card>
  ),
} satisfies Meta<typeof MadeUpRace>;

export default meta;

type Story = StoryObj<typeof meta>;

/** In a resting card, as on the desktop sky. */
export const Default: Story = {
  globals: { viewport: { value: "desktop" } },
};

/** A tablet's column. */
export const Tablet: Story = {
  tags: ["!autodocs"],
  globals: { viewport: { value: "tablet" } },
};
