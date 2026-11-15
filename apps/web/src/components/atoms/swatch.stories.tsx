import { CheckIcon } from "@phosphor-icons/react/Check";
import { CheckFatIcon } from "@phosphor-icons/react/CheckFat";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MEMBER_COLORS, type MemberColor } from "../../lib/member-color";
import type { ItemProps } from "./swatch";
import * as Swatch from "./swatch";

/** The icons the controls offer for a selected swatch, by name. */
const CHECK_ICONS = { check: CheckIcon, "check-fat": CheckFatIcon } as const;

/**
 * One swatch's args: its own props, its check icon picked by name, and
 * whether its group's value is its colour.
 */
type SwatchArgs = Pick<
  ItemProps,
  "color" | "takenBy" | "disabled" | "className"
> & {
  checkIcon: keyof typeof CHECK_ICONS;
  selected: boolean;
};

/** The design's picker: Cobalt picked, four colours taken by others. */
const OWNERS: Partial<Record<MemberColor, string>> = {
  vermilion: "Sam",
  green: "Lea",
  violet: "Max",
  amber: "Noor",
};

function TenColours() {
  return (
    <Swatch.Group aria-label="Colour" defaultValue="cobalt">
      {MEMBER_COLORS.map((color) => (
        <Swatch.Item
          key={color}
          color={color}
          takenBy={OWNERS[color]}
          disabled={color in OWNERS}
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
- \`color\` is a \`MemberColor\` from \`lib/member-color\`, whose \`MEMBER_COLORS\` lists the ten in the picker's order.

The controls set one swatch; **Group value** selects it. The **Picker** stories show the ten together.
`;

const meta = {
  title: "Atoms/Colour swatch",
  component: Swatch.Item,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
  argTypes: {
    checkIcon: {
      options: Object.keys(CHECK_ICONS),
      control: { type: "select" },
      description:
        "The icon a selected swatch shows, any Phosphor icon; picked by name here. A check by default.",
      table: { type: { summary: "Icon" } },
    },
    color: {
      control: { type: "select" },
      options: MEMBER_COLORS,
      table: { type: { summary: "MemberColor" } },
    },
    takenBy: {
      control: { type: "text" },
      table: { type: { summary: "string" } },
    },
    className: {
      control: false,
      table: { type: { summary: "string | (state) => string" } },
    },
    disabled: {
      control: { type: "boolean" },
      description: "The swatch can't be picked, as a colour someone has.",
    },
  },
} satisfies Meta<typeof Swatch.Item>;

export default meta;

type Story = StoryObj<SwatchArgs>;

const DEFAULTS: SwatchArgs = {
  color: "cobalt",
  takenBy: "",
  disabled: false,
  checkIcon: "check",
  selected: false,
};

/** One swatch in its group: the args set the swatch, and whether the group's value is its colour. */
const oneSwatch = {
  args: DEFAULTS,
  argTypes: {
    selected: {
      name: "Group value",
      control: { type: "boolean" },
      description:
        "`Swatch.Group`'s `value` is this swatch's colour: the swatch is selected.",
    },
  },
  render: ({ selected, checkIcon, ...item }) => (
    <Swatch.Group
      key={`${item.color}-${String(selected)}`}
      aria-label="Colour"
      defaultValue={selected ? item.color : undefined}
    >
      <Swatch.Item {...item} checkIcon={CHECK_ICONS[checkIcon]} />
    </Swatch.Group>
  ),
} satisfies Story;

/** Free: anyone can pick it. */
export const Free: Story = { ...oneSwatch };

/** Selected: a check and a charcoal ring. */
export const Selected: Story = {
  ...oneSwatch,
  args: { ...DEFAULTS, selected: true },
};

/** Taken: faded, with its owner's initial, and can't be picked. */
export const Taken: Story = {
  ...oneSwatch,
  args: { ...DEFAULTS, color: "vermilion", takenBy: "Sam", disabled: true },
};

/** Once all ten are taken, colours can be shared: a taken swatch can be picked, and the selected one doesn't fade. */
export const SelectedShared: Story = {
  ...oneSwatch,
  name: "Selected and shared",
  args: { ...DEFAULTS, color: "green", takenBy: "Lea", selected: true },
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
