import { shareKinds, units } from "@fpr/contracts/values";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useId } from "react";
import { walk } from "../../../mocks/story-curves";
import * as ShareCard from "./share-card";

/** Invented holders: members of an invented race. */
const PEOPLE = [
  { id: "p1", name: "Sam", color: "vermilion", photo: null },
  { id: "p2", name: "Alex", color: "cobalt", photo: null },
  { id: "p3", name: "Lea", color: "green", photo: null },
  { id: "p4", name: "Noor", color: "amber", photo: null },
  { id: "p5", name: "Max", color: "violet", photo: null },
  { id: "p6", name: "Tom", color: "cyan", photo: null },
] as const;

/** The share page's link, as the router's `<Link>` would be: the card gives it its content. */
function ShareLink(props: ComponentProps<"a">) {
  return <a {...props} href="#share" />;
}

/** An invented index fund, priced by today's refresh, up over the period. Times are read in UTC, so every reader sees the same. */
const UP = {
  size: "m",
  name: "World Index ETF",
  kind: "market",
  isin: "IE00FPRWLD17",
  symbol: "WRLD.DE",
  latestPrice: {
    at: "2026-03-31T14:30:00Z",
    priceEur: "98.40",
    source: "intraday",
  },
  change: { eur: "2.31", percent: "2.4" },
  curve: walk(11, 98.4, 0.35, 1.6),
  unit: "percent",
  holders: PEOPLE,
  link: <ShareLink />,
  timeZone: "UTC",
} as const satisfies ShareCard.BasicProps;

const DESCRIPTION = `
A share FPR knows, on the Shares page: the holding card with a share’s content. Its name links to its page; then its symbol and ISIN, or “Value entered by members” with a Manual badge; its curve over the period in the colour of its change; its latest price with its time and its change; and who holds it. Until its prices arrive, it shows them loading and Price pending. \`size="s"\` keeps the name and one line, for a share nobody holds. Import it as a namespace: \`import * as ShareCard from "…/share-card"\`.

| Part | What it is |
| --- | --- |
| \`ShareCard.Root\`, \`Header\`, \`Name\`, \`Caption\`, \`Curve\`, \`Foot\` | The holding card’s parts. |
| \`ShareCard.Price\` | The latest price with its time, and the change over the period. |
| \`ShareCard.Holders\` | The holders’ pictures and how many, or that nobody holds it. |
| \`ShareCard.Basic\` | The card ready-made from a share. |
`;

const meta = {
  title: "Molecules/Share card",
  component: ShareCard.Basic,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
  args: UP,
  argTypes: {
    size: { control: "inline-radio", options: ["m", "s"] },
    kind: { control: "inline-radio", options: shareKinds },
    unit: { control: "inline-radio", options: units },
    name: { control: "text" },
    isin: { control: "text" },
    symbol: { control: "text" },
    latestPrice: { control: "object" },
    change: { control: "object" },
    holders: { control: false },
    link: { control: false },
    curve: { control: false },
    timeZone: { control: "text" },
  },
  render: (args) => (
    <div className={args.size === "s" ? "max-w-[14rem]" : "max-w-[17rem]"}>
      <ShareCard.Basic {...args} />
    </div>
  ),
} satisfies Meta<typeof ShareCard.Basic>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A held share, up over the period, priced by today’s refresh. */
export const Up: Story = {};

/** A share down over the period, priced at yesterday’s close, its change in euros. */
export const Down: Story = {
  args: {
    name: "Euro Bank SA",
    isin: "FR00FPRBNK35",
    symbol: "EBNK.PA",
    latestPrice: {
      at: "2026-03-30T17:30:00Z",
      priceEur: "42.18",
      source: "close",
    },
    change: { eur: "-3.71", percent: "-8.1" },
    curve: walk(23, 42.18, -0.2, 0.9),
    unit: "eur",
    holders: PEOPLE.slice(0, 2),
  },
};

/** A fund members value by hand: a badge, and its value as of its last day. */
export const Manual: Story = {
  args: {
    name: "Global Tech Fund",
    kind: "manual",
    isin: "LU00FPRTEC25",
    symbol: null,
    latestPrice: {
      at: "2026-03-03T09:00:00Z",
      priceEur: "40.10",
      source: "manual",
    },
    change: { eur: "0.72", percent: "1.8" },
    curve: walk(37, 40.1, 0.06, 0.4),
    holders: PEOPLE.slice(0, 3),
  },
};

/** A held share whose prices haven’t arrived yet. */
export const PricePending: Story = {
  name: "Price pending",
  args: {
    name: "Nordic Wind AG",
    isin: "DE00FPRWND36",
    symbol: "NWND.DE",
    latestPrice: null,
    change: null,
    curve: [],
    holders: PEOPLE.slice(0, 2),
  },
};

/** A share nobody holds: its name and one line, smaller, more to a row. */
export const NotHeld: Story = {
  name: "Not held",
  args: { size: "s", name: "Asia Dividend ETF", holders: [] },
};

/** The parts composed by hand: a share’s price and holders with no curve, for a page that draws its chart elsewhere. */
export const Composed: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const nameId = useId();

    return (
      <div className="max-w-[17rem]">
        <ShareCard.Root aria-labelledby={nameId}>
          <ShareCard.Header>
            <ShareCard.Name id={nameId} link={<ShareLink />}>
              {UP.name}
            </ShareCard.Name>
          </ShareCard.Header>
          <ShareCard.Price
            latestPrice={UP.latestPrice}
            change={UP.change}
            unit="percent"
            timeZone="UTC"
          />
          <ShareCard.Holders holders={PEOPLE.slice(0, 3)} />
        </ShareCard.Root>
      </div>
    );
  },
};
