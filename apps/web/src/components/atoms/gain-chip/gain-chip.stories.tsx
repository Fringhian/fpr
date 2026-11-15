import type { Meta, StoryObj } from "@storybook/react-vite";
import { formatMoney } from "../../../lib/format";
import { useLanguage } from "../../../lib/i18n";
import { GainChip } from "./gain-chip";

const meta = {
  title: "Atoms/Gain chip",
  component: GainChip,
  tags: ["autodocs"],
  args: {
    gain: { eur: "455.10", percent: "7.7" },
    unit: "percent",
    precision: "cents",
  },
  argTypes: {
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
      description: "Classes added to the chip’s, which win any conflict.",
      control: false,
    },
  },
} satisfies Meta<typeof GainChip>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A gain: green on a soft green ground, with its plus sign. */
export const Gain: Story = {};

/** A loss: red on a soft red ground, with its minus sign. */
export const Loss: Story = {
  args: { gain: { eur: "-61.25", percent: "-2.5" } },
};

/** A gain that rounds to zero: grey on blush, with no sign. */
export const Flat: Story = {
  args: { gain: { eur: "0.00", percent: "0.0" } },
};

/** With the unit set to euros. */
export const InEuros: Story = {
  args: { unit: "eur" },
};

/**
 * An anonymous viewer receives no euro amounts: the chip reads in percent,
 * even with the unit set to euros.
 */
export const AnonymousViewer: Story = {
  args: { gain: { percent: "7.7" }, unit: "eur" },
};

/** The demo card's value, in the toolbar's language: the story's content, not the chip's. */
function CardValue() {
  return formatMoney("5904", useLanguage(), { precision: "euros" });
}

/** On a holding card, beside its value. */
export const OnACard: Story = {
  render: (args) => (
    <div className="flex w-[16.25rem] items-center justify-between rounded-l bg-surface p-m shadow-outline">
      <span className="text-l font-semibold tabular-nums">
        <CardValue />
      </span>
      <GainChip {...args} />
    </div>
  ),
};
