import { units } from "@fpr/contracts/values";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { expect, within } from "storybook/test";
import { MEMBER_COLORS } from "../../../lib/member-color";
import { walk } from "../../../mocks/story-curves";
import * as MemberStrip from "./member-strip";

/** The viewer's gain over the period, drawn faded behind everyone else's. */
const YOURS = walk(7, 4.2, 0.18, 0.9);

/** Invented members' gains over the period, in percent. */
const CURVES = {
  sam: walk(19, 6.1, 0.3, 0.9),
  lea: walk(41, 3.9, 0.2, 0.8),
  tom: walk(53, -2.7, -0.12, 0.9),
};

/** Invented shares, with their weight in a member's portfolio. */
const HOLDINGS = [
  { id: "world", name: "World Index ETF", weight: "46.0" },
  { id: "pharma", name: "Swiss Pharma AG", weight: "25.0" },
  { id: "bank", name: "Euro Bank SA", weight: "12.0" },
] as const satisfies readonly MemberStrip.StripHolding[];

/** The day each control's `since` names: a first entry, or none yet. */
const SINCE = {
  "2026-01-12": "2026-01-12",
  "2026-03-12": "2026-03-12",
  none: null,
} as const;

/** The stories' args: the strip's props, its link always on, `since` picked by name, `yours` switched on and off. */
type StripArgs = Omit<MemberStrip.BasicProps, "link" | "since" | "yours"> & {
  since: keyof typeof SINCE;
  yours: boolean;
};

/** A member page's link, as the router's `<Link>` would be: the strip gives it its content. */
function MemberLink(props: ComponentProps<"a">) {
  return <a {...props} href="#member" />;
}

function Strip({ since, yours, ...args }: StripArgs) {
  return (
    <MemberStrip.Basic
      {...args}
      since={SINCE[since]}
      yours={yours ? YOURS : undefined}
      link={<MemberLink />}
    />
  );
}

const SAM = {
  name: "Sam",
  color: "vermilion",
  photo: null,
  you: false,
  since: "2026-01-12",
  incomplete: false,
  points: CURVES.sam,
  yours: true,
  gain: { eur: "1241.30", percent: "6.1" },
  unit: "percent",
  balanceEur: "21600.00",
  holdings: HOLDINGS,
  holdingCount: 5,
} as const satisfies StripArgs;

/** Everyone in the list stories: you first, then alphabetically. */
const PEOPLE = [
  {
    ...SAM,
    name: "Alex",
    color: "cobalt",
    you: true,
    yours: false,
    points: YOURS,
    gain: { eur: "512.00", percent: "4.2" },
    balanceEur: "12374.00",
  },
  {
    ...SAM,
    name: "Ines",
    color: "pink",
    since: "none",
    points: [],
    gain: null,
    balanceEur: null,
    holdings: [],
    holdingCount: 0,
  },
  {
    ...SAM,
    name: "Lea",
    color: "green",
    since: "2026-03-12",
    points: CURVES.lea,
    gain: { eur: "880.00", percent: "3.9" },
    balanceEur: "23400.00",
    holdings: HOLDINGS.slice(0, 2),
    holdingCount: 2,
  },
  SAM,
  {
    ...SAM,
    name: "Tom",
    color: "cyan",
    incomplete: true,
    points: CURVES.tom,
    gain: { eur: "-410.00", percent: "-2.7" },
    balanceEur: "14800.00",
  },
] as const satisfies readonly StripArgs[];

/** The same people as an anonymous viewer reads them: pseudonyms, no balances, percentages and weights only. */
const PSEUDONYMS = [
  "Quiet Heron",
  "Brave Otter",
  "Swift Lynx",
  "Calm Badger",
  "Bright Finch",
];

const DESCRIPTION = `
One member in the Members list: their picture and name, “since” their first entry, their gain over the period in their colour with the viewer’s faded behind it, the gain and the balance, and their top holdings with their weights. The whole strip opens their page; the viewer’s own strip is tinted, says “· you” and opens their Portfolio.

- Before their first entry, the strip says “No shares yet” in the curve’s place, and a dash for the gain.
- A held share with no price yet adds “Incomplete”.
- An anonymous viewer reads pseudonyms and initials, the gain in percent, no balance, and the weights.
- Desktop lays the strips in columns, so names, curves, figures and holdings line up from one strip to the next. Tablet leaves the holdings out. Phone stacks the curve and the holdings, as one line of names, under the name.

\`Basic\` is the ready-made strip. A screen with a special need composes the parts:

| Part | What it is |
| --- | --- |
| \`List\` | The \`<ul>\` the strips go in. |
| \`Root\` | One member, an \`<li>\` card; \`you\` tints it. |
| \`Who\` | The picture, the name that opens the page, “since” and “Incomplete”. |
| \`Caret\` | The caret that says the strip opens a page. |
| \`Curve\` | Their gain over the period, the viewer’s faded behind. |
| \`NoShares\` | “No shares yet”, in the curve’s place. |
| \`Figures\` | The gain, and the balance under it from tablet up. |
| \`Holdings\` | The top holdings with their weights, and “+2 more”. |

The **Phone** and **Tablet** stories in the sidebar show the list at those widths.
`;

const meta = {
  title: "Organisms/Member strip",
  component: MemberStrip.Basic,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
} satisfies Meta<typeof MemberStrip.Basic>;

export default meta;

type Story = StoryObj<StripArgs>;

/** Every one-strip story's args, controls and render. */
const configurable = {
  args: SAM,
  argTypes: {
    name: { control: { type: "text" } },
    color: { control: { type: "select" }, options: MEMBER_COLORS },
    photo: { control: false },
    you: { control: { type: "boolean" } },
    since: {
      description:
        "The day of their first entry, or `null` before it. Picked by name here.",
      control: { type: "inline-radio" },
      options: Object.keys(SINCE),
    },
    incomplete: { control: { type: "boolean" } },
    points: { control: false },
    yours: {
      description:
        "The viewer's curve, drawn faded behind. Switched on and off here.",
      control: { type: "boolean" },
    },
    gain: { control: { type: "object" } },
    unit: { control: { type: "inline-radio" }, options: units },
    balanceEur: { control: { type: "text" } },
    holdings: { control: { type: "object" } },
    holdingCount: { control: { type: "number", min: 0 } },
  },
  render: (args) => (
    <MemberStrip.List>
      <Strip {...args} />
    </MemberStrip.List>
  ),
} satisfies Story;

/** One member, every prop in the Controls panel. */
export const Playground: Story = {
  ...configurable,
  play: async ({ canvasElement }) => {
    const strip = within(canvasElement);
    await expect(strip.getByRole("link", { name: "Sam" })).toHaveAttribute(
      "href",
      "#member",
    );
    await expect(strip.getByText("+2 more")).toBeInTheDocument();
  },
};

/** The viewer’s own strip: tinted, “· you”, and their curve alone. */
export const You: Story = {
  ...configurable,
  args: PEOPLE[0],
};

/** Before their first entry: “No shares yet” in the curve’s place, and a dash for the gain. */
export const NotStarted: Story = {
  ...configurable,
  name: "Not started",
  args: PEOPLE[1],
};

/** A held share has no price yet: “Incomplete”. */
export const Incomplete: Story = {
  ...configurable,
  args: PEOPLE[4],
};

/** The Members list: you first, then everyone alphabetically. */
export const List: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <MemberStrip.List>
      {PEOPLE.map((person) => (
        <Strip key={person.name} {...person} />
      ))}
    </MemberStrip.List>
  ),
};

/** The list as an anonymous viewer reads it: pseudonyms and initials, gains in percent, weights, no balances and no “you”. */
export const AnonymousViewer: Story = {
  name: "As an anonymous viewer",
  parameters: { controls: { disable: true } },
  render: () => (
    <MemberStrip.List>
      {PEOPLE.map((person, index) => (
        <Strip
          key={person.name}
          {...person}
          name={PSEUDONYMS[index] ?? person.name}
          you={false}
          yours={false}
          gain={person.gain && { percent: person.gain.percent }}
          balanceEur={undefined}
        />
      ))}
    </MemberStrip.List>
  ),
};

/** Which optional part the Parts story renders. */
interface PartsArgs {
  holdings: boolean;
}

/** The parts composed by hand. */
export const Parts: StoryObj<PartsArgs> = {
  args: { holdings: true },
  argTypes: {
    holdings: { control: { type: "boolean" }, name: "MemberStrip.Holdings" },
  },
  render: ({ holdings }) => (
    <MemberStrip.List>
      <MemberStrip.Root>
        <MemberStrip.Who
          name="Lea"
          color="green"
          photo={null}
          since="2026-03-12"
          link={<MemberLink />}
        />
        <MemberStrip.Caret />
        <MemberStrip.Curve
          name="Lea"
          color="green"
          points={CURVES.lea}
          unit="percent"
        />
        <MemberStrip.Figures
          gain={{ eur: "880.00", percent: "3.9" }}
          unit="percent"
          balanceEur="23400.00"
        />
        {holdings ? (
          <MemberStrip.Holdings holdings={HOLDINGS} count={3} />
        ) : null}
      </MemberStrip.Root>
    </MemberStrip.List>
  ),
};

/** The Docs page can’t narrow a story, so the narrower widths live in the sidebar only. */
export const Phone: Story = {
  ...List,
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
};

export const Tablet: Story = {
  ...List,
  tags: ["!autodocs"],
  globals: { viewport: { value: "tablet" } },
};
