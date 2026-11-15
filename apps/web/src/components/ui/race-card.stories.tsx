import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { cn } from "../../lib/cn";
import type { IsoDate } from "../../lib/format";
import type { MemberColor } from "../../lib/member-color";
import type { ChartPoint } from "./chart";
import { toDecimal } from "./chart-model";
import { MarketStatus } from "./market-status";
import * as RaceCard from "./race-card";
import * as Sky from "./sky";

/** The weekdays of March 2026 up to the 27th: the last one is today, after the last close. */
const DAYS: IsoDate[] = Array.from({ length: 26 }, (_, index) =>
  new Date(Date.UTC(2026, 2, 2 + index)).toISOString().slice(0, 10),
).filter((day) => {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return weekday !== 0 && weekday !== 6;
});

const TODAY = DAYS.at(-1) ?? "";
const LAST_CLOSE = DAYS.at(-2) ?? "";

/** An invented member: a name, a colour, where their gain ends in percent, and their balance. */
interface Runner {
  id: string;
  name: string;
  color: MemberColor;
  gain: number;
  balance: number;
}

/** An invented, repeatable curve from zero to `gain`, wandering on the way: the same on every load. */
function curve(seed: number, gain: number): number[] {
  let state = seed;
  return DAYS.map((_, index) => {
    state = (state * 16_807) % 2_147_483_647;
    const progress = index / (DAYS.length - 1);
    const wander = (state / 2_147_483_647 - 0.5) * 2.4;
    return gain * progress + wander * Math.sin(Math.PI * progress);
  });
}

/** The same runners, in percent and in euros, as the API sends either unit. */
function race(runners: readonly Runner[]) {
  const curves = runners.map((runner, index) => ({
    runner,
    values: curve(31 + index * 97, runner.gain),
  }));
  const member = (
    { id, name, color }: Runner,
    values: number[],
  ): RaceCard.RaceMember => ({
    id,
    name,
    color,
    points: values.map(
      (value, index): ChartPoint => ({
        day: DAYS[index] ?? "",
        value: toDecimal(value),
      }),
    ),
  });
  return {
    percent: curves.map(({ runner, values }) => member(runner, values)),
    eur: curves.map(({ runner, values }) =>
      member(
        runner,
        values.map((value) => Math.round((value * runner.balance) / 100)),
      ),
    ),
  };
}

const RACE = race([
  { id: "sam", name: "Sam", color: "vermilion", gain: 6.1, balance: 9_400 },
  { id: "alex", name: "Alex", color: "cobalt", gain: 4.2, balance: 12_374 },
  { id: "lea", name: "Lea", color: "green", gain: 3.9, balance: 7_100 },
  { id: "max", name: "Max", color: "violet", gain: 2.0, balance: 15_800 },
  { id: "noor", name: "Noor", color: "amber", gain: 0.8, balance: 4_300 },
  { id: "ines", name: "Ines", color: "pink", gain: -1.3, balance: 10_900 },
]);

const ALONE = race([
  { id: "alex", name: "Alex", color: "cobalt", gain: 4.2, balance: 12_374 },
]);

/** What an anonymous viewer receives: pseudonyms, no photos, and percentages only. */
const ANONYMOUS = race([
  {
    id: "otter",
    name: "Quiet Otter",
    color: "vermilion",
    gain: 6.1,
    balance: 0,
  },
  { id: "lynx", name: "Brave Lynx", color: "cobalt", gain: 4.2, balance: 0 },
  { id: "heron", name: "Calm Heron", color: "green", gain: 3.9, balance: 0 },
  { id: "fox", name: "Swift Fox", color: "violet", gain: 2.0, balance: 0 },
  { id: "wren", name: "Bright Wren", color: "amber", gain: 0.8, balance: 0 },
]);

/** Each race's members in euros, found from its members in percent, so the arrays stay stable. */
const IN_EUROS = new Map<readonly RaceCard.RaceMember[], RaceCard.RaceMember[]>(
  [RACE, ALONE].map((set) => [set.percent, set.eur]),
);

/** The story's args: the race's props, and whether the card renders its header. */
type RaceCardArgs = RaceCard.RaceProps & { header: boolean };

const gutters = cn("", "px-m", "tablet:px-l", "desktop:px-l");

/**
 * Home's top, with the race card resting on the horizon. Its sentence is the
 * story's demo content. It keeps the focus, as Home keeps it in the URL,
 * starting from the `focusId` control.
 */
function HomeTop({
  header,
  headline,
  ...race
}: RaceCardArgs & { headline: string }) {
  const [focusId, setFocusId] = useState(race.focusId);

  const members =
    race.unit === "eur"
      ? (IN_EUROS.get(race.members) ?? race.members)
      : race.members;

  return (
    <Sky.Root className={cn("pb-xl font-sans text-primary", gutters)}>
      <Sky.Band />
      <Sky.Header>
        <p
          className={cn(
            "flex items-center text-l font-semibold",
            "h-[4.375rem]",
            "tablet:h-[5rem]",
            "desktop:h-[5rem]",
          )}
        >
          Home
        </p>
        <p className="text-m text-on-sky">Good evening</p>
        <h1
          className={cn(
            "font-semibold",
            "text-xl",
            "tablet:text-display",
            "desktop:text-display",
          )}
        >
          {headline}
        </h1>
      </Sky.Header>
      <RaceCard.Root className="max-w-[50rem]">
        {header ? (
          <RaceCard.Header>
            <MarketStatus
              status="open"
              pricedAt={`${TODAY}T13:30:00Z`}
              timeZone="UTC"
            />
          </RaceCard.Header>
        ) : null}
        <RaceCard.Race
          {...race}
          members={members}
          focusId={focusId}
          onFocusMember={(id) => {
            race.onFocusMember?.(id);
            setFocusId(id);
          }}
        />
      </RaceCard.Root>
    </Sky.Root>
  );
}

/** The ids the cast controls offer, with none for a viewer who isn’t in the race. */
function castControl(members: readonly RaceCard.RaceMember[]) {
  return {
    control: { type: "select" },
    options: ["none", ...members.map((member) => member.id)],
    mapping: { none: null },
  } as const;
}

const DESCRIPTION = `
The hero of Home: every member’s gain over the period on one chart, in the one card that rests on the horizon, with the resting shadow. Import it as a namespace: \`import * as RaceCard from "…/race-card"\`.

| Part | What it is |
| --- | --- |
| \`RaceCard.Root\` | The card, resting on the horizon right under the sky’s ridge. |
| \`RaceCard.Header\` | “The race”, then its children on the right, such as the market status. |
| \`RaceCard.Race\` | The chart, its line ends, and the key to today’s dashed points. |

- Only you and the focused member are in colour, each named by a trail sign with their latest value. Everyone else is a thin grey line. Colour never has to tell ten people apart.
- On tablet and desktop each line ends with its owner’s picture, or for the two in colour, their sign. Marks that would overlap are nudged apart and tied to their line. On phone the lines end bare: the two signs sit under the chart, and the standings under the card are its legend.
- The points after the last close are dashed, and the card says “Today, not final”; the readout says it of that day.
- Selecting a curve, a picture or a sign calls \`onFocusMember\` with the member’s id. Pictures and signs are buttons, reached with the keyboard; the focused one is marked \`aria-current\`.
- A guest or an anonymous viewer has no line of their own: only the focused member is in colour. An anonymous viewer sees pseudonyms and initials, in percent.

The controls set the race’s props and switch the header. On this page every story renders at the page’s own width, a desktop width: the **Tablet** and **Phone** stories in the sidebar show the narrower ones.
`;

const meta = {
  title: "Organisms/Race card",
  component: RaceCard.Race,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: DESCRIPTION } },
    headline: "This month, you’re up 4.2%",
  },
  args: {
    header: true,
    members: RACE.percent,
    youId: "alex",
    focusId: "sam",
    lastClose: LAST_CLOSE,
    unit: "percent",
    onFocusMember: fn(),
  },
  argTypes: {
    header: {
      name: "RaceCard.Header",
      description:
        "Renders the header: “The race”, and the market status beside it.",
      control: { type: "boolean" },
    },
    members: { control: false },
    youId: castControl(RACE.percent),
    focusId: castControl(RACE.percent),
    lastClose: {
      control: {
        type: "select",
        labels: {
          [LAST_CLOSE]: "Yesterday: today dashed",
          [TODAY]: "Today: every point final",
        },
      },
      options: [LAST_CLOSE, TODAY],
    },
    unit: { control: { type: "inline-radio" }, options: ["eur", "percent"] },
    onFocusMember: { control: false },
  },
  // A new `focusId` from the controls starts the kept focus again.
  render: (args, { parameters }) => (
    <HomeTop
      key={String(args.focusId)}
      {...args}
      headline={String(parameters.headline)}
    />
  ),
} satisfies Meta<RaceCardArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Six members: you in blue, Sam focused in red on top, the others grey. Select a curve, a picture or a sign to focus its member. */
export const Race: Story = {
  globals: { viewport: { value: "desktop" } },
};

/** From tablet up, every line still ends with its picture. */
export const Tablet: Story = {
  tags: ["!autodocs"],
  globals: { viewport: { value: "tablet" } },
};

/** On phone the lines end bare, and the two signs sit under the chart. */
export const Phone: Story = {
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
};

/** Alone in the race: your line and your sign. */
export const RaceOfOne: Story = {
  args: { members: ALONE.percent, focusId: null },
  argTypes: {
    youId: castControl(ALONE.percent),
    focusId: castControl(ALONE.percent),
  },
  parameters: { headline: "You’re the first one in" },
  globals: { viewport: { value: "desktop" } },
};

/** An anonymous viewer: pseudonyms and initials, in percent only, and no line of their own, so only the focused member is in colour. */
export const AnonymousViewer: Story = {
  args: {
    members: ANONYMOUS.percent,
    youId: null,
    focusId: "otter",
  },
  argTypes: {
    youId: { control: false },
    focusId: castControl(ANONYMOUS.percent),
    unit: { control: false },
  },
  parameters: { headline: "Quiet Otter leads the month" },
  globals: { viewport: { value: "desktop" } },
};

/** Selecting your sign, with the keyboard, focuses you: Sam’s sign goes, and yours is marked current. */
export const SelectingAMember: Story = {
  tags: ["!autodocs"],
  parameters: { controls: { disable: true } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const you = await canvas.findByRole("button", { name: /^You/ });
    await expect(canvas.getByRole("button", { name: /^Sam/ })).toHaveAttribute(
      "aria-current",
      "true",
    );

    you.focus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onFocusMember).toHaveBeenCalledWith("alex");
    await waitFor(() =>
      expect(canvas.queryByRole("button", { name: /^Sam/ })).toBeNull(),
    );
    await expect(
      await canvas.findByRole("button", { name: /^You/ }),
    ).toHaveAttribute("aria-current", "true");
  },
};
