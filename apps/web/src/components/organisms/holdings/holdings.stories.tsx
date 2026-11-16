import type { PortfolioHolding, ShareSummary } from "@fpr/contracts";
import { units } from "@fpr/contracts/values";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { expect, within } from "storybook/test";
import { walk } from "../../../mocks/story-curves";
import * as HoldingCard from "../../molecules/holding-card/holding-card";
import * as Holdings from "./holdings";

/** A share page's link, as the router's `<Link>` would be: the card gives it its content. */
function ShareLink(props: ComponentProps<"a">) {
  return <a {...props} href="#share" />;
}

const shareLink = () => <ShareLink />;

/** An invented share, with an invented ISIN. */
function share(
  id: string,
  name: string,
  kind: ShareSummary["kind"] = "market",
): ShareSummary {
  return {
    id,
    isin: `XS${id.padStart(9, "0").slice(0, 9).toUpperCase()}0`,
    name,
    kind,
    symbol: kind === "manual" ? null : `${id.toUpperCase()}.PA`,
  };
}

/** A share's prices over the period, at each day's close, ending on `end`. */
function prices(seed: number, end: number, drift: number) {
  return walk(seed, end, drift, end / 50).map(({ day, value }) => ({
    at: `${day}T16:30:00Z`,
    priceEur: value,
  }));
}

/** An invented member's holdings, in no particular order: the grid sorts them. */
const HOLDINGS: PortfolioHolding[] = [
  {
    share: share("bank", "Euro Bank SA"),
    quantity: "55",
    valueEur: "2266.00",
    weight: "12.0",
    gain: { eur: "-22.90", percent: "-1.0" },
    latestPrice: {
      at: "2026-03-31T14:30:00Z",
      priceEur: "41.20",
      source: "intraday",
    },
    pricesFrom: null,
    series: prices(23, 41.2, -0.02),
  },
  {
    share: share("pharma", "Swiss Pharma AG"),
    quantity: "110",
    valueEur: "9669.00",
    weight: "46.0",
    gain: { eur: "1066.40", percent: "12.4" },
    latestPrice: {
      at: "2026-03-31T14:30:00Z",
      priceEur: "87.90",
      source: "intraday",
    },
    pricesFrom: null,
    series: prices(11, 87.9, 0.4),
  },
  {
    share: share("tech", "Global Tech Fund", "manual"),
    quantity: "12.5",
    valueEur: "501.25",
    weight: "2.4",
    gain: { eur: "15.10", percent: "3.1" },
    latestPrice: {
      at: "2026-03-03T16:00:00Z",
      priceEur: "40.10",
      source: "manual",
    },
    pricesFrom: null,
    series: prices(37, 40.1, 0.05),
  },
  {
    share: share("world", "World Index ETF"),
    quantity: "40",
    valueEur: "3936.00",
    weight: "18.7",
    gain: { eur: "352.10", percent: "9.8" },
    latestPrice: {
      at: "2026-03-31T14:30:00Z",
      priceEur: "98.40",
      source: "intraday",
    },
    pricesFrom: null,
    series: prices(7, 98.4, 0.3),
  },
  {
    share: share("wind", "Nordic Wind AG"),
    quantity: "4",
    valueEur: null,
    weight: null,
    gain: null,
    latestPrice: null,
    pricesFrom: null,
    series: [],
  },
];

/** The viewer, an invented member, who holds two of the same shares. */
const HELD_BY_YOU = {
  look: { name: "Alex", color: "cobalt", photo: null },
  shareIds: new Set(["world", "tech"]),
} as const satisfies Holdings.HeldByYou;

/** The same holdings as an anonymous viewer receives them: no values, no gains in euros, weights in place of quantities. */
const ANONYMOUS = HOLDINGS.map(({ valueEur: _value, gain, ...holding }) => ({
  ...holding,
  quantity: holding.weight ?? "0",
  gain: gain && { percent: gain.percent },
})) as PortfolioHolding[];

const DESCRIPTION = `
A portfolio’s holdings, one holding card per share, largest first and every one shown, a share whose prices are pending last: on a member’s page and on Portfolio. One column on phone, two on tablet, as many as fit on desktop.

- Each card opens its share’s page, through the link \`shareLink\` gives it.
- On someone else’s page, \`heldByYou\` puts the viewer’s small picture on the cards of the shares they hold too.
- On your own, \`actions\` gives each card its ⋯ items, such as Buy more and Sell.
- An anonymous viewer reads weights in place of quantities and values, and gains in percent.
- Cards after the holdings, such as the cash card, go in as children, each in an \`Item\`.

| Part | What it is |
| --- | --- |
| \`Grid\` | The \`<ul>\` the cards go in. |
| \`Item\` | One card’s place, an \`<li>\`. |
| \`Basic\` | The holdings’ cards, sorted, then the children. |

The **Phone** and **Tablet** stories in the sidebar show the grid at those widths.
`;

const meta = {
  title: "Organisms/Holdings",
  component: Holdings.Basic,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
} satisfies Meta<typeof Holdings.Basic>;

export default meta;

/** The stories' args: `heldByYou` switched on and off. */
type HoldingsArgs = Omit<Holdings.BasicProps, "heldByYou" | "shareLink"> & {
  heldByYou: boolean;
};

type Story = StoryObj<HoldingsArgs>;

const configurable = {
  args: {
    holdings: HOLDINGS,
    unit: "percent",
    anonymous: false,
    heldByYou: true,
    timeZone: "UTC",
  },
  argTypes: {
    holdings: { control: false },
    unit: { control: { type: "inline-radio" }, options: units },
    anonymous: { control: { type: "boolean" } },
    heldByYou: {
      description:
        "The viewer and the shares they hold too. Switched on and off here.",
      control: { type: "boolean" },
    },
    actions: { control: false },
    timeZone: { control: { type: "text" } },
    children: { control: false },
  },
  render: ({ heldByYou, ...args }) => (
    <Holdings.Basic
      {...args}
      heldByYou={heldByYou ? HELD_BY_YOU : null}
      shareLink={shareLink}
    />
  ),
} satisfies Story;

/** Someone else’s holdings, largest first: the viewer’s picture on the shares they hold too. */
export const SomeoneElses: Story = {
  ...configurable,
  name: "Someone else’s",
  play: async ({ canvasElement }) => {
    const grid = within(canvasElement);
    const cards = grid.getAllByRole("article");
    await expect(cards[0]).toHaveAccessibleName("Swiss Pharma AG");
    await expect(cards.at(-1)).toHaveAccessibleName("Nordic Wind AG");
    await expect(
      grid.getAllByRole("img", { name: "You hold it too" }),
    ).toHaveLength(2);
  },
};

/** What an anonymous viewer sees: weights in place of quantities and values, gains in percent. */
export const AnonymousViewer: Story = {
  ...configurable,
  name: "As an anonymous viewer",
  args: {
    ...configurable.args,
    holdings: ANONYMOUS,
    anonymous: true,
    heldByYou: false,
  },
};

/** Your own holdings, as Portfolio shows them: then the cash card, in an `Item`. */
export const WithCash: Story = {
  ...configurable,
  name: "With the cash card",
  args: { ...configurable.args, heldByYou: false },
  render: ({ heldByYou: _heldByYou, ...args }) => (
    <Holdings.Basic {...args} shareLink={shareLink}>
      <Holdings.Item>
        <HoldingCard.Cash amountEur="1000.00" weight="4.8" setOn="2026-02-12" />
      </Holdings.Item>
    </Holdings.Basic>
  ),
};

/** The Docs page can’t narrow a story, so the narrower widths live in the sidebar only. */
export const Phone: Story = {
  ...SomeoneElses,
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
};

export const Tablet: Story = {
  ...SomeoneElses,
  tags: ["!autodocs"],
  globals: { viewport: { value: "tablet" } },
};
