import type { Meta, StoryObj } from "@storybook/react-vite";
import { type Mover, MoverList, MoverRow } from "./mover-row";

/** A member's movers over the month: two gains and a loss. */
const MOVERS: readonly Mover[] = [
  {
    id: "c6a1e0f2-4b3d-4e5f-8a7b-1c2d3e4f5a61",
    name: "Example Pharma SA",
    gain: { eur: "620.00", percent: "12.4" },
  },
  {
    id: "d7b2f103-5c4e-4f60-9b8c-2d3e4f5a6b72",
    name: "World Index ETF",
    gain: { eur: "180.00", percent: "2.4" },
  },
  {
    id: "e8c30214-6d5f-4071-ac9d-3e4f5a6b7c83",
    name: "Euro Bank SA",
    gain: { eur: "-40.00", percent: "-1.0" },
  },
];

const DESCRIPTION = `
One holding’s effect on a member’s period, in the focus panel: the share’s name, a bar, and the holding’s gain over the period with its sign.

- \`MoverList\` takes the movers, biggest effect first, and draws each as a \`MoverRow\`. It scales every bar against the biggest mover it holds, on one zero line: a gain grows to the right, a loss to the left. With gains only, the zero line sits at the start.
- The bar is decorative: the sign and the colour of the gain say its direction, never the colour alone.
- The gain reads in the unit setting, euros in whole euros. An anonymous viewer has no euros, so it reads in percent; a holding bought during the period has no percentage, so it reads in euros. Bars are scaled within the unit they read in.
- The names, bars and gains line up in columns across the rows. A name too long for its column ends in “…”.
- With no movers, the list says nothing has moved yet.
- Each bar is a \`BarTrack\`, the lane's bar too, on the list's \`moverScale\` from \`src/lib/mover.ts\`.
`;

const meta = {
  title: "Organisms/Mover row",
  component: MoverList,
  subcomponents: { MoverRow },
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
  args: { movers: MOVERS, unit: "percent" },
  argTypes: {
    movers: {
      description:
        "Each mover’s `id`, share `name`, and `gain` (`{ eur, percent }`, decimal strings as the API sends them). Remove `eur` to read as an anonymous viewer.",
      control: { type: "object" },
    },
    unit: { control: { type: "inline-radio" }, options: ["percent", "eur"] },
  },
  render: (args) => (
    <div className="max-w-[18.75rem]">
      <MoverList {...args} aria-label="What moved them" />
    </div>
  ),
} satisfies Meta<typeof MoverList>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Two gains and a loss, in the panel’s column: the loss grows left of the zero line. */
export const GainsAndALoss: Story = { name: "Gains and a loss" };

/** With the unit set to euros: each holding’s gain in whole euros. */
export const InEuros: Story = { name: "In euros", args: { unit: "eur" } };

/** Gains only: the zero line sits at the start, and the biggest gain fills the track. */
export const GainsOnly: Story = {
  name: "Gains only",
  args: { movers: MOVERS.slice(0, 2) },
};

/** A losing period: every bar grows left of the zero line, at the track’s end. */
export const LossesOnly: Story = {
  name: "Losses only",
  args: {
    movers: [
      {
        id: "f9d41325-7e60-4182-bdae-4f5a6b7c8d94",
        name: "Green Energy Fund",
        gain: { eur: "-310.00", percent: "-8.6" },
      },
      {
        id: "0ae52436-8f71-4293-8ebf-5a6b7c8d9ea5",
        name: "Euro Bank SA",
        gain: { eur: "-40.00", percent: "-1.0" },
      },
    ],
  },
};

/** An anonymous viewer has no euros: every gain reads in percent, even with the unit set to euros. */
export const AnonymousViewer: Story = {
  name: "Anonymous viewer",
  args: {
    unit: "eur",
    movers: MOVERS.map(({ gain, ...mover }) => ({
      ...mover,
      gain: { percent: gain.percent },
    })),
  },
};

/** A holding bought during the period has no percentage: it reads in euros, on a scale of its own. A gain that rounds to zero draws no bar. */
export const BoughtDuringThePeriod: Story = {
  name: "Bought during the period",
  args: {
    movers: [
      ...MOVERS.slice(0, 2),
      {
        id: "1bf63547-9082-43a4-9fc0-6b7c8d9eafb6",
        name: "Tech Leaders ETF",
        gain: { eur: "75.00", percent: null },
      },
      {
        id: "2c074658-a193-44b5-a0d1-7c8d9eafb0c7",
        name: "Example Bond Fund",
        gain: { eur: "0.20", percent: "0.01" },
      },
    ],
  },
};

/** A long share name ends in “…”, and the columns stay lined up. */
export const LongName: Story = {
  name: "Long name",
  args: {
    movers: [
      {
        id: "3d18576a-b2a4-45c6-b1d2-8d9eafb0c1d8",
        name: "Example Global Small Cap Sustainable Leaders Index Fund",
        gain: { eur: "1240.00", percent: "21.7" },
      },
      ...MOVERS.slice(1),
    ],
  },
};

/** Nothing has moved yet: a member who just started, or a period before its first close. */
export const NoMoversYet: Story = {
  name: "No movers yet",
  args: { movers: [] },
};

/** At the full width of a tablet or a phone, the bars’ track grows with it. */
export const FullWidth: Story = {
  name: "Full width",
  render: (args) => <MoverList {...args} aria-label="What moved them" />,
};
