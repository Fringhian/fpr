import type { IsoDate } from "@fpr/contracts";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { cn } from "../../../lib/cn";
import { formatDate } from "../../../lib/format/date";
import { Chart, type ChartLine, type ChartPoint } from "./chart";
import { toDecimal } from "./chart-model";

/** The weekdays from 2 March 2026, a trading month and a half. */
const DAYS: IsoDate[] = Array.from({ length: 44 }, (_, index) =>
  new Date(Date.UTC(2026, 2, 2 + index)).toISOString().slice(0, 10),
).filter((day) => {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return weekday !== 0 && weekday !== 6;
});

const FIRST_DAY = DAYS[0] ?? "";
const LAST_DAY = DAYS.at(-1) ?? "";
const LAST_CLOSE = DAYS.at(-2) ?? "";

/** An invented, repeatable random walk: the same curve on every load. */
function walk(seed: number, start: number, drift: number, swing: number) {
  let state = seed;
  let value = start;
  return DAYS.map((day): ChartPoint => {
    state = (state * 16_807) % 2_147_483_647;
    value += (state / 2_147_483_647 - 0.5) * swing + drift;
    return { day, value: toDecimal(value) };
  });
}

/** One share’s price: an invented index fund. */
const PRICE: readonly ChartLine[] = [
  {
    id: "world-index",
    label: "World Index ETF",
    color: "primary",
    points: walk(7, 100, 0.12, 2.4),
  },
];

/** A share going up and one going down, as the cards draw them. */
const RISING: readonly ChartLine[] = [
  {
    id: "world-index",
    label: "World Index ETF",
    color: "positive",
    points: walk(11, 100, 0.25, 2),
  },
];

/** Several members’ gains in percent: two in colour, the others behind them in grey, today dashed. */
const RACE: readonly ChartLine[] = [
  { id: "lea", label: "Lea", points: walk(41, 0, 0.09, 0.9) },
  { id: "max", label: "Max", points: walk(53, 0, 0.04, 0.9) },
  { id: "noor", label: "Noor", points: walk(67, 0, -0.03, 0.9) },
].map(
  (line): ChartLine => ({
    ...line,
    color: "muted",
    emphasis: "context",
    dashedAfter: LAST_CLOSE,
  }),
);
const SEVERAL_LINES: readonly ChartLine[] = [
  ...RACE,
  {
    id: "sam",
    label: "Sam",
    color: "vermilion",
    points: walk(31, 0, 0.19, 0.9),
    dashedAfter: LAST_CLOSE,
  },
  {
    id: "alex",
    label: "You",
    color: "cobalt",
    points: walk(19, 0, 0.13, 0.9),
    dashedAfter: LAST_CLOSE,
  },
];

const card = cn(
  "rounded-l bg-surface shadow-rest font-sans text-primary",
  "p-m",
  "tablet:p-l",
  "desktop:p-l",
);

const DESCRIPTION = `
The one chart every chart in FPR is built on, on TradingView Lightweight Charts. It fills its container’s width and follows it as it resizes; its height is 208px for a line chart and 34px for a sparkline, and a \`className\` height wins. Its colours are the tokens of \`theme.css\`, read where it sits.

- **line**: the left axis and the days in \`secondary\` text, a dashed \`divider\` grid, and a dashed crosshair. Hovering shows the crosshair and a readout of every line on that day. The chart takes focus: the left and right arrow keys move the crosshair from day to day with the same readout, Home and End go to the ends, Escape leaves, and each step is read out to screen readers.
- **sparkline**: the line alone, for cards. No axes, no grid, no interaction; its \`label\` names it to screen readers.
- **lines**: each line has its colour token, a label, its points (a day and the decimal string the API sends), and optionally the last final day: the points after it are dashed and read “not final”. \`emphasis: "context"\` draws a thin line behind the ones in focus, as the race draws the other members in grey. Lines draw in order, the last on top.
- **unit**, **precision** and **signed** format every value of the axis and the readout with \`lib/format\`, in the reader’s language.
- **overlay** and **onSelectLine**, on a line chart: the overlay is drawn over the chart from where each line ends, and redrawn as it resizes; a click or a tap on a line, or close to it, calls \`onSelectLine\` with its \`id\`. The race card draws its pictures and signs with them.

Nothing moves on its own: no panning, zooming or kinetic scroll, and with \`prefers-reduced-motion\` the readout jumps from day to day instead of sliding. Pass a stable \`lines\` array: a new one redraws every line.

Every other prop goes to the chart’s outer \`<div>\`, \`className\` included.

The charts carry no TradingView logo: How FPR works credits TradingView Lightweight Charts with its link, as the library’s licence asks.
`;

const meta = {
  title: "Molecules/Chart",
  component: Chart,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
  args: {
    variant: "line",
    lines: PRICE,
    label: "World Index ETF, price since 2 March",
    unit: "money",
    precision: "cents",
    signed: false,
  },
  argTypes: {
    variant: {
      control: { type: "inline-radio" },
      options: ["line", "sparkline"],
    },
    unit: {
      control: { type: "inline-radio" },
      options: ["money", "percent"],
    },
    precision: {
      control: { type: "inline-radio" },
      options: ["cents", "euros"],
      if: { arg: "unit", eq: "money" },
    },
    signed: { control: { type: "boolean" } },
    label: { control: { type: "text" } },
    lines: { control: false },
    overlay: { control: false },
    onSelectLine: { control: false },
    className: {
      description:
        "Classes added to the chart’s own, which win any conflict, such as its height.",
      control: false,
    },
  },
  render: (args) => (
    <div className={cn(card, "max-w-[45rem]")}>
      <Chart {...args} />
    </div>
  ),
} satisfies Meta<typeof Chart>;

export default meta;

type Story = StoryObj<typeof meta>;

/** One share’s price. Hover it, or focus it and use the arrow keys. */
export const Line: Story = {};

/** The line alone, as a holding card draws it under the share’s name. */
export const Sparkline: Story = {
  args: {
    variant: "sparkline",
    lines: RISING,
    label: "World Index ETF, price since 2 March, rising",
  },
  render: (args) => (
    <div className={cn(card, "grid max-w-[20rem] gap-s")}>
      <p className="truncate text-m font-semibold">World Index ETF</p>
      <p className="text-s text-secondary">40 units · €108.40</p>
      <Chart {...args} />
      <p className="text-l font-semibold tabular-nums">€4,336</p>
    </div>
  ),
};

/** Members’ gains: two lines in their colours, the others thin and grey behind them, and today dashed after the last close. The readout names each line. */
export const SeveralLines: Story = {
  args: {
    lines: SEVERAL_LINES,
    label: "The race: each member’s gain since 2 March",
    unit: "percent",
    signed: true,
  },
};

/** Focus the chart, then the arrow keys move the crosshair and its readout, and each step is read out. */
export const Keyboard: Story = {
  parameters: { controls: { disable: true } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chart = canvas.getByRole("group", {
      name: "World Index ETF, price since 2 March",
    });
    const live = canvasElement.querySelector("[aria-live]");
    const said = (day: IsoDate) => formatDate(day, "en", { style: "weekday" });

    await userEvent.tab();
    await expect(chart).toHaveFocus();

    await userEvent.keyboard("{ArrowLeft}");
    await waitFor(() => expect(live).toHaveTextContent(said(LAST_DAY)));

    // A redraw (a resize, the font arriving) keeps the keyboard's point and its announcement.
    const frame = canvasElement.firstElementChild;
    if (frame instanceof HTMLElement) frame.style.maxWidth = "30rem";
    await new Promise((done) => setTimeout(done, 300));
    await expect(live).toHaveTextContent(said(LAST_DAY));

    await userEvent.keyboard("{ArrowLeft}");
    await waitFor(() =>
      expect(live).toHaveTextContent(said(DAYS.at(-2) ?? "")),
    );

    await userEvent.keyboard("{Home}");
    await waitFor(() => expect(live).toHaveTextContent(said(FIRST_DAY)));
    await expect(live).toHaveTextContent("€");

    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() => expect(live).toHaveTextContent(said(DAYS[1] ?? "")));
  },
};
