import type { Meta, StoryObj } from "@storybook/react-vite";
import * as Swatch from "./swatch";
import { type ItemProps, MEMBER_COLOURS, type MemberColour } from "./swatch";

/** One swatch's args: its own props, and whether its group has it selected. */
type SwatchArgs = Pick<
  ItemProps,
  "colour" | "takenBy" | "disabled" | "className"
> & {
  selected: boolean;
};

/** The design's picker: Cobalt picked, four colours taken by others. */
const OWNERS: Partial<Record<MemberColour, string>> = {
  vermilion: "Sam",
  green: "Lea",
  violet: "Max",
  amber: "Noor",
};

function TenColours() {
  return (
    <Swatch.Group aria-label="Colour" defaultValue="cobalt">
      {MEMBER_COLOURS.map((colour) => (
        <Swatch.Item
          key={colour}
          colour={colour}
          takenBy={OWNERS[colour]}
          disabled={colour in OWNERS}
        />
      ))}
    </Swatch.Group>
  );
}

const DESCRIPTION = `
One of the ten member colours in the picker, a radio in a group. Import it as a namespace: \`import * as Swatch from "…/swatch"\`.

| Part | What it is |
| --- | --- |
| \`Swatch.Group\` | The picker: one choice among the swatches, Base UI's \`RadioGroup\`. Five per line on phone, one wrapping row from tablet up. Its \`value\` is a colour name. |
| \`Swatch.Item\` | One colour, Base UI's \`Radio\`: free, selected (a check and a charcoal ring), or taken (faded, with its owner's initial). |

- A taken colour can't be picked unless all ten are taken: pass \`disabled\` with \`takenBy\`, and leave it out once every colour is taken. A selected swatch never fades, even when shared.
- Screen readers hear the colour's name, and its owner when taken: “Vermilion, taken by Sam”.
- \`MEMBER_COLOURS\` lists the ten colours in the picker's order.

The controls set one swatch; **Group value** selects it. The **Picker** stories show the ten together.
`;

const meta = {
  title: "Atoms/Colour swatch",
  component: Swatch.Item,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
  args: { colour: "cobalt", takenBy: "", disabled: false, selected: false },
  argTypes: {
    colour: {
      control: { type: "select" },
      options: MEMBER_COLOURS,
      table: { type: { summary: "MemberColour" } },
    },
    takenBy: {
      control: { type: "text" },
      table: { type: { summary: "string" } },
    },
    className: { control: false, table: { type: { summary: "string" } } },
    disabled: {
      control: { type: "boolean" },
      description: "The swatch can't be picked, as a colour someone has.",
    },
    selected: {
      name: "Group value",
      control: { type: "boolean" },
      description:
        "`Swatch.Group`'s `value` is this swatch's colour: the swatch is selected.",
    },
  },
  render: ({ selected, ...item }) => (
    <Swatch.Group
      key={`${item.colour}-${String(selected)}`}
      aria-label="Colour"
      defaultValue={selected ? item.colour : undefined}
    >
      <Swatch.Item {...item} />
    </Swatch.Group>
  ),
} satisfies Meta<SwatchArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Free: anyone can pick it. */
export const Free: Story = {};

/** Selected: a check and a charcoal ring. */
export const Selected: Story = { args: { selected: true } };

/** Taken: faded, with its owner's initial, and can't be picked. */
export const Taken: Story = {
  args: { colour: "vermilion", takenBy: "Sam", disabled: true },
};

/** Once all ten are taken, colours can be shared: a taken swatch can be picked, and the selected one doesn't fade. */
export const SelectedShared: Story = {
  name: "Selected and shared",
  args: { colour: "green", takenBy: "Lea", selected: true },
};

/** The ten colours in the picker, as onboarding and Settings show them. */
export const Picker: Story = {
  parameters: { controls: { disable: true } },
  render: () => <TenColours />,
};

/** On phone, five swatches per line. */
export const PickerPhone: Story = {
  tags: ["!autodocs"],
  parameters: { controls: { disable: true } },
  globals: { viewport: { value: "phone" } },
  render: () => <TenColours />,
};
