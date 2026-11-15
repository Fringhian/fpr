import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useArgs } from "storybook/preview-api";
import { expect, userEvent, within } from "storybook/test";
import { TextLink } from "../atoms/text-link";
import {
  Standings,
  type StandingsBoard,
  type StandingsMember,
  type StandingsProps,
} from "./standings";

/** An abstract photo, drawn inline: a sun over two hills, no person. */
const PHOTO = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'><defs><linearGradient id='g' x1='0' y1='0' x2='0.4' y2='1'><stop offset='0' stop-color='#f6b48f'/><stop offset='1' stop-color='#8c6a9e'/></linearGradient></defs><rect width='96' height='96' fill='url(#g)'/><circle cx='62' cy='34' r='14' fill='#ffe6b8'/><path d='M0 70 C24 52 44 54 64 66 C76 72 86 70 96 62 V96 H0Z' fill='#5d4a6e'/><path d='M0 82 C30 72 58 76 96 84 V96 H0Z' fill='#3d3150'/></svg>",
)}`;

/** The standings by gain over the month, in percent, highest first: invented members and shares. */
const BY_GAIN = [
  {
    id: "sam",
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
    id: "alex",
    name: "Alex",
    color: "cobalt",
    photo: PHOTO,
    best: { share: "World Index ETF", percent: "5.8" },
    value: {
      board: "gain",
      gain: { eur: "512.40", percent: "4.2" },
      unit: "percent",
    },
  },
  {
    id: "lea",
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
    id: "noor",
    name: "Noor",
    color: "amber",
    best: { share: "Swiss Pharma AG", percent: "12.4" },
    value: {
      board: "gain",
      gain: { eur: "96", percent: "0.8" },
      unit: "percent",
    },
  },
  {
    id: "milo",
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
    id: "ines",
    name: "Ines",
    color: "pink",
    best: { share: "Euro Bond Fund", percent: "0.4" },
    value: {
      board: "gain",
      gain: { eur: "-88.10", percent: "-1.3" },
      unit: "percent",
    },
    measuredFrom: "2026-11-04",
  },
  {
    id: "theo",
    name: "Theo",
    color: "cyan",
    best: { share: "Asia Retail Fund", percent: "-0.9" },
    value: {
      board: "gain",
      gain: { eur: "-205", percent: "-2.4" },
      unit: "percent",
    },
  },
] as const satisfies readonly StandingsMember[];

/** The balance of each member of `BY_GAIN`, in euros. */
const BALANCES = {
  alex: "12374",
  noor: "12100",
  sam: "10610",
  theo: "8340",
  lea: "8020",
  ines: "6690",
  milo: "4900",
} as const satisfies Record<(typeof BY_GAIN)[number]["id"], string>;

/** The same members by balance, highest first. A balance is as of the last close, measured from no day. */
const BY_BALANCE: readonly StandingsMember[] = BY_GAIN.toSorted(
  (a, b) => Number(BALANCES[b.id]) - Number(BALANCES[a.id]),
).map(
  ({ value: _gain, ...member }): StandingsMember => ({
    ...member,
    measuredFrom: null,
    value: { board: "balance", balance: BALANCES[member.id] },
  }),
);

/** Each board's rows, as the owner would load them when the switch changes. */
const BOARDS = {
  gain: BY_GAIN,
  balance: BY_BALANCE,
} satisfies Record<StandingsBoard, readonly StandingsMember[]>;

/** Invented pseudonyms, as the anonymizer gives them. */
const PSEUDONYMS = [
  "Calm Heron",
  "Bright Otter",
  "Swift Finch",
  "Gentle Bison",
  "Brave Marten",
  "Merry Wren",
  "Steady Elk",
] as const;

/** As an anonymous viewer sees the race: pseudonyms, no photos, and gains in percent though the unit setting is euros. */
const ANONYMOUS: readonly StandingsMember[] = BY_GAIN.map(
  (member, index): StandingsMember => ({
    ...member,
    name: PSEUDONYMS[index] ?? member.name,
    photo: null,
    value: {
      board: "gain",
      gain: { percent: member.value.gain.percent },
      unit: "eur",
    },
  }),
);

/** The stories' args: the standings' own props, with the panel fixed by the story. */
type StandingsArgs = Omit<StandingsProps, "panel">;

/** The standings sit at the width of Home's content column. */
const inTheColumn: Decorator = (Story) => (
  <div className="max-w-[47.5rem]">
    <Story />
  </div>
);

const DESCRIPTION = `
Every member's lane in one card, highest first, with the Gain / Balance switch, and the members who haven't started listed under the lanes.

- The lanes share one scale, from \`laneScale\` in \`src/lib/lane.ts\`, so the zero line sits at the same place in each and the bar lengths compare. The order and the bars show the ranking: there are no rank numbers. The lanes are an ordered list.
- The first three lanes ring their pictures in gold, silver and bronze on tablet and desktop. The viewer's own lane, named by \`viewerId\`, is tinted.
- \`board\` and \`onBoardChange\` hold the switch. Each member's \`value\` names the board it was measured on: when the switch changes, the owner loads that board's rows and passes them as \`members\`.
- An anonymous viewer has the standings by gain only: \`anonymous\` removes the switch.
- \`focusedId\` and \`onFocusMember\` hold the focused member. Pressing a lane focuses its member and opens that lane in place; pressing the focused lane again calls \`onFocusMember(null)\`, back to the viewer. On phone the opened lane shows the best share, then \`panel\`; on tablet and desktop the best share stays under the name, and the lane opens only when \`panel\` gives it something to show.
- With nobody in the race yet, the card says so where the lanes go, with no switch.

On this page every story renders at the page's own width, a desktop width: the **On tablet**, **On phone** and **Phone, focused** stories in the sidebar show the narrower ones.
`;

const meta = {
  title: "Organisms/Standings",
  component: Standings,
  tags: ["autodocs"],
  decorators: [inTheColumn],
  parameters: {
    docs: { description: { component: DESCRIPTION } },
  },
} satisfies Meta<typeof Standings>;

export default meta;

type Story = StoryObj<StandingsArgs>;

/** A link to the member's page, the opened lane's content in every story. */
function pageLink(member: StandingsMember) {
  return (
    <TextLink href={`#${member.id}`} toPage className="text-s">
      Open {member.name}’s page
    </TextLink>
  );
}

/**
 * The standings in an owner that holds the board and the focus, as Home
 * will: the interaction stories press the switch and the lanes through it.
 */
function StandingsOwner(args: StandingsArgs) {
  const [board, setBoard] = useState(args.board);
  const [focusedId, setFocusedId] = useState(args.focusedId ?? null);

  return (
    <Standings
      {...args}
      board={board}
      members={BOARDS[board]}
      onBoardChange={setBoard}
      focusedId={focusedId}
      onFocusMember={setFocusedId}
      panel={pageLink}
    />
  );
}

/** Every configurable story's args, controls and render. */
const configurable = {
  args: {
    board: "gain",
    anonymous: false,
    period: "this month",
    members: BY_GAIN,
    notStarted: ["Kim", "Nora"],
    viewerId: "alex",
    focusedId: null,
  },
  argTypes: {
    board: {
      control: { type: "inline-radio" },
      options: ["gain", "balance"],
      table: { type: { summary: `"gain" | "balance"` } },
    },
    anonymous: { control: { type: "boolean" } },
    period: { control: { type: "text" } },
    members: {
      control: { type: "object" },
      table: { type: { summary: "readonly StandingsMember[]" } },
    },
    notStarted: {
      control: { type: "object" },
      table: { type: { summary: "readonly string[]" } },
    },
    viewerId: {
      control: { type: "text" },
      table: { type: { summary: "string | null" } },
    },
    focusedId: {
      control: { type: "text" },
      table: { type: { summary: "string | null" } },
    },
    onBoardChange: { table: { disable: true } },
    onFocusMember: { table: { disable: true } },
  },
  /**
   * The switch and the lanes write back to the args, so the Controls panel
   * follows a press: a new board brings its own rows, as the owner would
   * load them. Storybook's hooks run in a story's render only.
   */
  render: function ConfiguredStandings(args) {
    const [, updateArgs] = useArgs<StandingsArgs>();
    return (
      <Standings
        {...args}
        onBoardChange={(board) => updateArgs({ board, members: BOARDS[board] })}
        onFocusMember={(focusedId) => updateArgs({ focusedId })}
        panel={pageLink}
      />
    );
  },
} satisfies Story;

/** A full race: seven members, the viewer tinted, an incomplete lane, a history shorter than the month, two losses, and two members who haven't started. Press a lane to focus its member. */
export const FullRace: Story = {
  ...configurable,
  name: "Full race",
};

/** The standings by balance: every bar right of the zero line, the balance in whole euros, in a new order. */
export const ByBalance: Story = {
  ...configurable,
  name: "By balance",
  args: { ...configurable.args, board: "balance", members: BY_BALANCE },
};

/** A focused member: their lane is open, here with a link to their page. */
export const Focused: Story = {
  ...configurable,
  args: { ...configurable.args, focusedId: "lea" },
};

/** As an anonymous viewer sees it: by gain only, with no switch, pseudonyms, and every gain in percent. They have no lane of their own. */
export const AnonymousViewer: Story = {
  ...configurable,
  name: "Anonymous viewer",
  args: {
    ...configurable.args,
    anonymous: true,
    members: ANONYMOUS,
    notStarted: ["Quiet Lynx"],
    viewerId: null,
  },
};

/** Nobody has recorded a share yet: the card says so where the lanes go, with nothing to switch, and names who hasn't started. */
export const EmptyRace: Story = {
  ...configurable,
  name: "Empty race",
  args: {
    ...configurable.args,
    members: [],
    notStarted: ["Alex", "Kim", "Nora", "Sam"],
  },
};

/** Pressing Balance brings the balance rows; pressing a lane focuses its member. */
export const Switching: Story = {
  ...configurable,
  tags: ["!autodocs"],
  parameters: { controls: { disable: true } },
  render: (args) => <StandingsOwner {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Balance" }));
    // Alex leads by balance.
    await userEvent.click(
      await canvas.findByRole("button", { name: /^Noor.*€12,100$/ }),
    );
    await expect(
      await canvas.findByRole("button", { expanded: true }),
    ).toHaveAccessibleName(/^Noor/);
    const lanes = within(canvas.getByRole("list")).getAllByRole("listitem");
    await expect(lanes[0]).toHaveTextContent(/^Alex/);
  },
};

export const OnTablet: Story = {
  ...configurable,
  name: "On tablet",
  tags: ["!autodocs"],
  globals: { viewport: { value: "tablet" } },
};

/** The phone shows no ring and leaves the best share out of the row. */
export const OnPhone: Story = {
  ...configurable,
  name: "On phone",
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
};

/** On phone, pressing a lane focuses the member and opens the lane in place: their best share, then the link to their page. */
export const PhoneFocused: Story = {
  ...configurable,
  name: "Phone, focused",
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
  parameters: { controls: { disable: true } },
  render: (args) => <StandingsOwner {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /^Lea/ }));
    await expect(
      await canvas.findByRole("button", { expanded: true }),
    ).toBeVisible();
    await expect(canvas.getByText("Best share")).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: /Open Lea’s page/ }),
    ).toBeVisible();
  },
};
