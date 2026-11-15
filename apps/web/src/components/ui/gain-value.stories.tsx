import type { ArgTypes, Meta, StoryObj } from "@storybook/react-vite";
import { GainValue, type GainValueProps } from "./gain-value";

/** The gain, the unit, and the precision, as the gain chip's story has them. */
const GAIN_ARG_TYPES = {
  gain: {
    description:
      "`{ eur, percent }`, decimal strings as the API sends them. Remove `eur` to read as an anonymous viewer; set `percent` to `null` for a start at zero.",
    control: { type: "object" },
  },
  unit: { control: { type: "inline-radio" }, options: ["percent", "eur"] },
  precision: {
    control: { type: "inline-radio" },
    options: ["cents", "euros"],
    if: { arg: "unit", eq: "eur" },
  },
  className: {
    description: "Classes added to the value’s, which win any conflict.",
    control: false,
  },
} satisfies Partial<ArgTypes<GainValueProps>>;

const meta = {
  title: "Atoms/Gain value",
  component: GainValue,
  tags: ["autodocs"],
  args: {
    gain: { eur: "512.40", percent: "6.1" },
    unit: "percent",
    precision: "cents",
  },
  argTypes: GAIN_ARG_TYPES,
} satisfies Meta<typeof GainValue>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A gain: green, with its plus sign. */
export const Gain: Story = {};

/** A loss: red, with its minus sign (U+2212), never a hyphen. */
export const Loss: Story = {
  args: { gain: { eur: "-18.30", percent: "-1.3" } },
};

/** A gain that rounds to zero: grey, with no sign. */
export const Flat: Story = {
  args: { gain: { eur: "0.00", percent: "0.0" } },
};

/** With the unit set to euros, here a balance's gain in whole euros. */
export const InEuros: Story = {
  args: { unit: "eur", precision: "euros" },
};

/**
 * An anonymous viewer receives no euro amounts: the gain reads in percent,
 * even with the unit set to euros.
 */
export const AnonymousViewer: Story = {
  args: { gain: { percent: "4.2" }, unit: "eur" },
};

/** It takes the size of its text: a lane's value, a card's, the headline's. */
export const InEveryTextSize: Story = {
  render: (args) => (
    <div className="grid justify-items-start gap-s">
      <GainValue {...args} className="text-s" />
      <GainValue {...args} className="text-l" />
      <GainValue {...args} className="text-xl" />
    </div>
  ),
};
