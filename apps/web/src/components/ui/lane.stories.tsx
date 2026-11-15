import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useArgs } from "storybook/preview-api";
import { expect, within } from "storybook/test";
import { type LaneValue, laneScale } from "../../lib/lane";
import { MEMBER_COLORS } from "../../lib/member-color";
import { Lane, LaneNotStarted, type LaneProps } from "./lane";
import type { PictureMedal } from "./picture";
import { TextLink } from "./text-link";

/** An abstract photo, drawn inline: a sun over two hills, no person. */
const PHOTO = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'><defs><linearGradient id='g' x1='0' y1='0' x2='0.4' y2='1'><stop offset='0' stop-color='#f6b48f'/><stop offset='1' stop-color='#8c6a9e'/></linearGradient></defs><rect width='96' height='96' fill='url(#g)'/><circle cx='62' cy='34' r='14' fill='#ffe6b8'/><path d='M0 70 C24 52 44 54 64 66 C76 72 86 70 96 62 V96 H0Z' fill='#5d4a6e'/><path d='M0 82 C30 72 58 76 96 84 V96 H0Z' fill='#3d3150'/></svg>",
)}`;

const PHOTOS = { none: null, photo: PHOTO } as const;
type PhotoName = keyof typeof PHOTOS;

const MEDALS = [
  "gold",
  "silver",
  "bronze",
] as const satisfies readonly PictureMedal[];

/** A standings by gain over the month, in percent, highest first: invented members and shares. */
const STANDINGS = [
  {
    name: "Sam",
    color: "vermilion",
    best: { share: "Swiss Pharma AG", percent: "12.4" },
    value: {
      board: "gain",
      gain: { eur: "610", percent: "6.1" },
      unit: "percent",
    },
  },
  {
    name: "Alex",
    color: "cobalt",
    you: true,
    best: { share: "World Index ETF", percent: "5.8" },
    value: {
      board: "gain",
      gain: { eur: "512.40", percent: "4.2" },
      unit: "percent",
    },
  },
  {
    name: "Lea",
    color: "green",
    best: { share: "Global Tech Fund", percent: "7.9" },
    value: {
      board: "gain",
      gain: { eur: "301", percent: "3.9" },
      unit: "percent",
    },
  },
  {
    name: "Milo",
    color: "violet",
    best: { share: "Nordic Wind AG", percent: "2.2" },
    value: {
      board: "gain",
      gain: { eur: "48", percent: "0.6" },
      unit: "percent",
    },
    incomplete: true,
  },
  {
    name: "Ines",
    color: "pink",
    best: { share: "Euro Bond Fund", percent: "0.4" },
    value: {
      board: "gain",
      gain: { eur: "-88.10", percent: "-1.3" },
      unit: "percent",
    },
    measuredFrom: "2026-02-12",
  },
] as const satisfies readonly LaneProps[];

const STANDINGS_SCALE = laneScale(
  STANDINGS.map(({ value }): LaneValue => value),
);

/** The lanes sit in a card, as in the standings. */
const inACard: Decorator = (Story) => (
  <div className="max-w-[47.5rem] rounded-l bg-surface p-s shadow-rest">
    <Story />
  </div>
);

const DESCRIPTION = `
One member in the standings: their picture, name and best share, a bar from the zero line, and their value. The order and the bars show the ranking: there are no rank numbers.

- Gains go right of the zero line and losses left. Every lane of one standings shares a \`scale\`, from \`laneScale\` in \`src/lib/lane.ts\`, so the zero line sits at the same place in each and the bar lengths compare.
- The viewer’s own lane is tinted, with “· you” after the name.
- The first three lanes ring their pictures in gold, silver and bronze on tablet and desktop. The phone shows no ring.
- A member whose history starts after the period’s start says “since” that day; a member with a share whose prices haven’t arrived says “Incomplete”.
- Members with no entry yet aren’t lanes: \`LaneNotStarted\` names them in one line under the lanes.
- An anonymous viewer sees pseudonyms, no photos, and every gain in percent, whatever the unit setting.
- The whole row is a button. Pressing it opens the lane in place: on phone, where the best share isn’t under the name, the opened lane shows it, then whatever the standings put inside it, such as a link to the member’s page.

On this page every story renders at the page’s own width, a desktop width: the **On tablet**, **On phone** and **Phone, opened** stories in the sidebar show the narrower ones.
`;

/** The stories' args: the photo and the medal are picked by name, `none` for neither. */
type LaneArgs = Omit<LaneProps, "photo" | "medal" | "children"> & {
  photo: PhotoName;
  medal: PictureMedal | "none";
};

const meta = {
  title: "Molecules/Lane",
  component: Lane,
  tags: ["autodocs"],
  decorators: [inACard],
  parameters: {
    docs: { description: { component: DESCRIPTION } },
  },
  argTypes: {
    children: {
      description:
        "What the opened lane shows under its row at every width, such as a link to the member’s page.",
      control: false,
    },
  },
} satisfies Meta<typeof Lane>;

export default meta;

type Story = StoryObj<LaneArgs>;

/**
 * Writes the lane's open state back to the args, so the Controls panel
 * follows a press. Storybook's hooks run in a story's render only.
 */
function useOpenArg(): (open: boolean) => void {
  const [, updateArgs] = useArgs<LaneArgs>();
  return (open) => updateArgs({ open });
}

/** One lane from the args. */
function renderLane(
  { photo, medal, ...args }: LaneArgs,
  onOpenChange: (open: boolean) => void,
  children?: LaneProps["children"],
) {
  return (
    <Lane
      {...args}
      photo={PHOTOS[photo]}
      medal={medal === "none" ? null : medal}
      onOpenChange={onOpenChange}
    >
      {children}
    </Lane>
  );
}

/** Every configurable story's args, controls and render: one lane, in the standings' scale. */
const configurable = {
  args: {
    name: "Sam",
    color: "vermilion",
    photo: "none",
    you: false,
    medal: "none",
    best: { share: "Swiss Pharma AG", percent: "12.4" },
    value: {
      board: "gain",
      gain: { eur: "610", percent: "6.1" },
      unit: "percent",
    },
    scale: STANDINGS_SCALE,
    measuredFrom: null,
    incomplete: false,
    open: false,
  },
  argTypes: {
    name: { control: { type: "text" } },
    color: {
      control: { type: "select" },
      options: MEMBER_COLORS,
      table: { type: { summary: "MemberColor" } },
    },
    photo: {
      description:
        "The member’s photo, or `null` for their initial. Here, picked by name: no photo, or an abstract photo.",
      control: { type: "inline-radio" },
      options: Object.keys(PHOTOS),
      table: { type: { summary: "string | null" } },
    },
    you: {
      control: { type: "boolean" },
      table: { type: { summary: "boolean" } },
    },
    medal: {
      control: { type: "inline-radio" },
      options: ["none", ...MEDALS],
      table: { type: { summary: `"gold" | "silver" | "bronze" | null` } },
    },
    best: {
      control: { type: "object" },
      table: {
        type: { summary: "{ share: string; percent: Decimal | null } | null" },
      },
    },
    value: {
      control: { type: "object" },
      table: {
        type: {
          summary: `{ board: "gain"; gain: { eur?: Decimal; percent: Decimal | null }; unit: "eur" | "percent" } | { board: "balance"; balance: Decimal | null }`,
        },
      },
    },
    scale: {
      control: { type: "object" },
      table: { type: { summary: "{ min: number; max: number }" } },
    },
    measuredFrom: {
      control: { type: "text" },
      table: { type: { summary: "IsoDate | null" } },
    },
    incomplete: {
      control: { type: "boolean" },
      table: { type: { summary: "boolean" } },
    },
    open: {
      description:
        "Base UI’s `open`: the lane is open. On phone it shows the best share under the row, then `children`.",
      control: { type: "boolean" },
      table: { type: { summary: "boolean" } },
    },
    defaultOpen: {
      description:
        "Base UI’s `defaultOpen`: the lane’s starting state when `open` isn’t controlled.",
      control: false,
      table: { type: { summary: "boolean" } },
    },
    onOpenChange: {
      description:
        "Base UI’s `onOpenChange`: called when the lane is pressed, with the state it asks for. The standings focus the member with it.",
      control: false,
      table: {
        type: { summary: "(open: boolean, eventDetails) => void" },
      },
    },
    className: {
      description:
        "Classes added to the lane’s, which win any conflict: a string, or a function of the collapsible’s state.",
      control: false,
    },
  },
  render: function ConfigurableLane(args) {
    return renderLane(args, useOpenArg());
  },
} satisfies Story;

/** A gain over the period: the bar goes right of the zero line, the value in green with its sign. Press the lane to open it. */
export const Gain: Story = { ...configurable };

/** A loss: the bar goes left of the zero line, the value in red with its minus. */
export const Loss: Story = {
  ...configurable,
  args: {
    ...configurable.args,
    name: "Ines",
    color: "pink",
    best: { share: "Euro Bond Fund", percent: "0.4" },
    value: {
      board: "gain",
      gain: { eur: "-88.10", percent: "-1.3" },
      unit: "percent",
    },
  },
};

/** The viewer’s own lane: tinted, with “· you” after the name. */
export const YourLane: Story = {
  ...configurable,
  name: "Your lane",
  args: {
    ...configurable.args,
    name: "Alex",
    color: "cobalt",
    photo: "photo",
    you: true,
    best: { share: "World Index ETF", percent: "5.8" },
    value: {
      board: "gain",
      gain: { eur: "512.40", percent: "4.2" },
      unit: "percent",
    },
  },
};

/** The gain in euros, from the unit setting, rounded to whole euros. */
export const InEuros: Story = {
  ...configurable,
  name: "In euros",
  args: {
    ...configurable.args,
    value: { board: "gain", gain: { eur: "610", percent: "6.1" }, unit: "eur" },
    scale: { min: -88.1, max: 610 },
  },
};

/** The standings by balance: the balance in whole euros, every bar right of the zero line. */
export const Balance: Story = {
  ...configurable,
  args: {
    ...configurable.args,
    value: { board: "balance", balance: "12374" },
    scale: { min: 0, max: 15200 },
  },
};

/** A held share has no price yet: it is left out of the balance, and the lane says so. */
export const Incomplete: Story = {
  ...configurable,
  args: {
    ...configurable.args,
    name: "Milo",
    color: "violet",
    best: { share: "Nordic Wind AG", percent: "2.2" },
    value: {
      board: "gain",
      gain: { eur: "48", percent: "0.6" },
      unit: "percent",
    },
    incomplete: true,
  },
};

/** A history shorter than the period: the gain is measured from the first entry, and the lane names that day. */
export const ShortHistory: Story = {
  ...configurable,
  name: "Short history",
  args: {
    ...configurable.args,
    name: "Ines",
    color: "pink",
    best: { share: "Euro Bond Fund", percent: "0.4" },
    value: {
      board: "gain",
      gain: { eur: "-88.10", percent: "-1.3" },
      unit: "percent",
    },
    measuredFrom: "2026-02-12",
  },
};

/** As an anonymous viewer sees it: a pseudonym, its initial, and the gain in percent though the unit setting is euros. */
export const AnonymousViewer: Story = {
  ...configurable,
  name: "Anonymous viewer",
  args: {
    ...configurable.args,
    name: "Calm Heron",
    value: { board: "gain", gain: { percent: "6.1" }, unit: "eur" },
  },
};

/** Opened: under the row, what the standings put inside it, here a link to the member’s page. On tablet and desktop the best share stays under the name. */
export const Opened: Story = {
  ...configurable,
  args: { ...configurable.args, open: true },
  render: function OpenedLane(args) {
    return renderLane(
      args,
      useOpenArg(),
      <TextLink href="#sam" toPage className="text-s">
        Open Sam’s page
      </TextLink>,
    );
  },
};

/** On phone the best share leaves the row; opening the lane shows it, with its gain. */
export const PhoneOpened: Story = {
  ...Opened,
  name: "Phone, opened",
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { expanded: true })).toBeVisible();
    await expect(canvas.getByText("Best share")).toBeVisible();
  },
};

function Standings() {
  return (
    <div className="flex flex-col gap-[0.125rem]">
      {STANDINGS.map((member, index) => (
        <Lane
          key={member.name}
          {...member}
          medal={MEDALS[index] ?? null}
          scale={STANDINGS_SCALE}
        />
      ))}
    </div>
  );
}

/** The first three lanes ring their pictures in gold, silver and bronze, with the viewer’s lane tinted, an incomplete lane and a loss below. */
export const Medals: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Standings />,
};

export const OnTablet: Story = {
  ...Medals,
  name: "On tablet",
  tags: ["!autodocs"],
  globals: { viewport: { value: "tablet" } },
};

/** The phone shows no ring and leaves the best share out of the row. */
export const OnPhone: Story = {
  ...Medals,
  name: "On phone",
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
};

/** Members with no entry yet aren’t lanes: one line under the lanes names them. */
export const NotStarted: Story = {
  name: "Not started",
  parameters: { controls: { disable: true } },
  render: () => (
    <>
      <Standings />
      <LaneNotStarted names={["Kim", "Nora"]} />
    </>
  ),
};
