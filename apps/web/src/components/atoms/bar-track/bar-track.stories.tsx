import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { barScale } from "../../../lib/bar-track";
import { MEMBER_COLORS } from "../../../lib/member-color";
import { BarTrack } from "./bar-track";

/** A track as wide as a lane's bar column. */
const inAColumn: Decorator = (Story) => (
  <div className="w-[16rem] py-s">
    <Story />
  </div>
);

/** A set of gains, in percent, drawn on one scale. */
const GAINS = [6.1, 4.2, 0.6, -1.3, -2.4] as const;
const GAINS_SCALE = barScale(GAINS);

const DESCRIPTION = `
A bar from a zero line, the bar of a lane and of a mover row.

- A gain goes right of the zero line and a loss left, its length relative to the \`scale\` it shares with the tracks beside it: \`barScale\` in \`src/lib/bar-track.ts\` gives it, so the zero lines line up and the lengths compare.
- Any amount other than zero draws at least a short bar; zero, or \`null\`, draws only the zero line.
- When the amount or the scale changes, the bar eases to its new length; with reduced motion, it moves at once.
- Decorative: hidden from assistive technology, so the figure beside it says the value.
`;

const meta = {
  title: "Atoms/Bar track",
  component: BarTrack,
  tags: ["autodocs"],
  decorators: [inAColumn],
  parameters: {
    docs: { description: { component: DESCRIPTION } },
  },
  args: {
    amount: 4.2,
    scale: GAINS_SCALE,
    color: "cobalt",
    size: "m",
  },
  argTypes: {
    amount: { control: { type: "number", step: 0.1 } },
    scale: {
      control: { type: "object" },
      table: { type: { summary: "{ min: number; max: number }" } },
    },
    color: {
      control: { type: "select" },
      options: [...MEMBER_COLORS, "positive", "negative"],
    },
    size: { control: { type: "inline-radio" }, options: ["s", "m"] },
  },
} satisfies Meta<typeof BarTrack>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A gain, in a member's colour, as a lane draws it. */
export const Gain: Story = {};

/** A loss: left of the zero line. */
export const Loss: Story = {
  args: { amount: -2.4, color: "pink" },
};

/** A small amount still draws a short bar. */
export const Small: Story = {
  args: { amount: 0.05, color: "violet" },
};

/** Nothing to draw: only the zero line. */
export const NoAmount: Story = {
  name: "No amount",
  args: { amount: null },
};

/** In the colour of a gain's sign, at the small size, as a mover row draws it. */
export const SignColours: Story = {
  name: "Sign colours",
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-m">
      <BarTrack
        amount={12.4}
        scale={barScale([12.4, -1])}
        color="positive"
        size="s"
      />
      <BarTrack
        amount={-1}
        scale={barScale([12.4, -1])}
        color="negative"
        size="s"
      />
    </div>
  ),
};

/** Tracks on one scale: their zero lines line up and their lengths compare. */
export const OneScale: Story = {
  name: "One scale",
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-m">
      {GAINS.map((amount, index) => (
        <BarTrack
          key={amount}
          amount={amount}
          scale={GAINS_SCALE}
          color={MEMBER_COLORS[index] ?? "cobalt"}
        />
      ))}
    </div>
  ),
};
