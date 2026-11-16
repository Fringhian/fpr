import type { IsoDate, Language } from "@fpr/contracts";
import { shareKinds, units } from "@fpr/contracts/values";
import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import { DotsThreeIcon } from "@phosphor-icons/react/DotsThree";
import { DotsThreeVerticalIcon } from "@phosphor-icons/react/DotsThreeVertical";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { cn } from "../../../lib/cn";
import { useLanguage } from "../../../lib/i18n";
import type { ChartPoint } from "../chart/chart";
import { toDecimal } from "../chart/chart-model";
import * as Menu from "../menu/menu";
import {
  CashCard,
  type CashCardProps,
  HoldingCard,
  type HoldingCardProps,
} from "./holding-card";

/** The weekdays of March 2026: the period the curves cover. */
const DAYS: IsoDate[] = Array.from({ length: 31 }, (_, index) =>
  new Date(Date.UTC(2026, 2, 1 + index)).toISOString().slice(0, 10),
).filter((day) => {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return weekday !== 0 && weekday !== 6;
});

/** An invented, repeatable random walk ending on `end`: the same curve on every load. */
function walk(seed: number, end: number, drift: number, swing: number) {
  let state = seed;
  const steps = DAYS.map(() => {
    state = (state * 16_807) % 2_147_483_647;
    return (state / 2_147_483_647 - 0.5) * swing + drift;
  });
  let value = end - steps.reduce((sum, step) => sum + step, 0);
  return DAYS.map((day, index): ChartPoint => {
    value += steps[index] ?? 0;
    return { day, value: toDecimal(value) };
  });
}

/** Invented shares, held by an invented member. */
const WORLD_INDEX = walk(11, 98.4, 0.35, 1.6);
const EURO_BANK = walk(23, 42.18, -0.1, 0.9);
const GLOBAL_TECH = walk(37, 40.1, 0.06, 0.4);

/** The demo menu items, in the toolbar’s language. They are the stories’ content, not the card’s. */
const TEXTS = {
  en: { buyMore: "Buy more", sell: "Sell" },
  fr: { buyMore: "En acheter", sell: "Vendre" },
} as const satisfies Record<Language, Record<string, string>>;

/** Buy more and Sell, as Portfolio passes them to your own holding’s ⋯ menu. */
function Actions() {
  const text = TEXTS[useLanguage()];

  return (
    <>
      <Menu.Item>{text.buyMore}</Menu.Item>
      <Menu.Item>{text.sell}</Menu.Item>
    </>
  );
}

/** The link icons the Controls panel offers, by name. */
const LINK_ICONS = {
  "caret-right": CaretRightIcon,
  "arrow-right": ArrowRightIcon,
} as const;

/** The ⋯ button's icons the Controls panel offers, by name. */
const ACTIONS_ICONS = {
  "dots-three": DotsThreeIcon,
  "dots-three-vertical": DotsThreeVerticalIcon,
} as const;

/**
 * The stories’ args: the card’s props, with its slots picked in the Controls
 * panel. `link` and `actions` turn on the share link and the ⋯ menu, and
 * their icons are picked by name.
 */
type StoryArgs = Omit<
  HoldingCardProps,
  "link" | "linkIcon" | "actions" | "actionsIcon"
> & {
  link: boolean;
  linkIcon: keyof typeof LINK_ICONS;
  actions: boolean;
  actionsIcon: keyof typeof ACTIONS_ICONS;
};

/** The share page's link, as the router's `<Link>` would be: the card gives it its content. */
function ShareLink(props: ComponentProps<"a">) {
  return <a {...props} href="#share" />;
}

function Card({ link, linkIcon, actions, actionsIcon, ...props }: StoryArgs) {
  return (
    <div className="max-w-[17rem]">
      <HoldingCard
        {...props}
        link={link ? <ShareLink /> : undefined}
        linkIcon={LINK_ICONS[linkIcon]}
        actions={actions ? <Actions /> : undefined}
        actionsIcon={ACTIONS_ICONS[actionsIcon]}
      />
    </div>
  );
}

/** An invented index fund, priced by today’s refresh, up over the period. Times are read in UTC, so every reader sees the same. */
const GAIN = {
  name: "World Index ETF",
  kind: "market",
  quantity: "60",
  latestPrice: {
    at: "2026-03-31T14:30:00Z",
    priceEur: "98.40",
    source: "intraday",
  },
  curve: WORLD_INDEX,
  valueEur: "5904.00",
  weight: "49.5",
  gain: { eur: "421.80", percent: "7.7" },
  unit: "percent",
  anonymous: false,
  timeZone: "UTC",
} as const satisfies HoldingCardProps;

/** An invented bank, down over the period, priced at yesterday’s close. */
const LOSS = {
  ...GAIN,
  name: "Euro Bank SA",
  quantity: "25",
  latestPrice: {
    at: "2026-03-30T17:30:00Z",
    priceEur: "42.18",
    source: "close",
  },
  curve: EURO_BANK,
  valueEur: "1054.50",
  weight: "8.8",
  gain: { eur: "-50.75", percent: "-4.6" },
} as const satisfies HoldingCardProps;

/** An invented fund nobody tracks, valued by members, held with decimals. */
const MANUAL = {
  ...GAIN,
  name: "Global Tech Fund",
  kind: "manual",
  quantity: "74.328",
  latestPrice: {
    at: "2026-03-03T16:00:00Z",
    priceEur: "40.10",
    source: "manual",
  },
  curve: GLOBAL_TECH,
  valueEur: "2980.55",
  weight: "25.0",
  gain: { eur: "90.12", percent: "3.1" },
} as const satisfies HoldingCardProps;

/** An invented share just bought, whose prices haven’t arrived yet. */
const PENDING = {
  ...GAIN,
  name: "Nordic Wind AG",
  quantity: "4",
  latestPrice: null,
  curve: [],
  valueEur: null,
  weight: null,
  gain: null,
} as const satisfies HoldingCardProps;

/** The ⋯ menu and the share link, on by default: your own holding. */
const SLOTS = {
  link: true,
  linkIcon: "caret-right",
  actions: true,
  actionsIcon: "dots-three",
} as const satisfies Partial<StoryArgs>;

const DESCRIPTION = `
One share someone holds: its name, the quantity as entered with the latest price and its time, a curve of the price over the period, the value, and the gain over the period.

- **Your holding**: \`actions\` takes the ⋯ menu’s items, such as Buy more and Sell. The card knows no route: the page passes them. \`actionsIcon\` is the button’s icon, three dots by default.
- **link**: the router’s link to the share’s page; the whole card opens it, and the name ends with \`linkIcon\`, a caret by default.
- **Manual** share (\`kind="manual"\`): a badge, and the price “as of” the day of its last value point.
- **Price pending** (\`latestPrice={null}\`): its prices are loading, and it is not counted yet.
- **anonymous**: the weight in percent replaces the quantity and the value, and the gain reads in percent.
- **CashCard**, the last card: the cash, the day it was set, and Update cash, ended by \`updateCashIcon\`, a caret by default.

Every other prop goes to the \`<article>\`. The **Phone** and **Tablet** stories in the sidebar show the cards in a grid at the narrower widths.
`;

const meta = {
  title: "Molecules/Holding card",
  component: HoldingCard,
  subcomponents: { CashCard },
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
  args: GAIN,
  argTypes: {
    name: { control: { type: "text" } },
    kind: { control: { type: "inline-radio" }, options: shareKinds },
    quantity: { control: { type: "text" } },
    latestPrice: { control: { type: "object" } },
    curve: { control: false },
    valueEur: { control: { type: "text" } },
    weight: { control: { type: "text" } },
    gain: { control: { type: "object" } },
    unit: { control: { type: "inline-radio" }, options: units },
    anonymous: { control: { type: "boolean" } },
    link: { control: { type: "boolean" } },
    linkIcon: {
      control: { type: "select" },
      options: Object.keys(LINK_ICONS),
      if: { arg: "link" },
    },
    actions: { control: { type: "boolean" }, name: "actions (⋯ menu)" },
    actionsIcon: {
      control: { type: "select" },
      options: Object.keys(ACTIONS_ICONS),
      if: { arg: "actions" },
    },
    timeZone: { control: { type: "text" } },
    className: {
      description: "Classes added to the card’s, which win any conflict.",
      control: false,
    },
  },
} satisfies Meta<typeof HoldingCard>;

export default meta;

type Story = StoryObj<typeof meta>;

type CardStory = StoryObj<StoryArgs>;

/** One card, its slots switched in the Controls panel. */
const card = {
  render: (args) => <Card {...args} />,
} satisfies CardStory;

/** Your holding, up over the period: the gain and the curve in green. ⋯ opens Buy more and Sell. */
export const Gain = { ...card, args: SLOTS } satisfies CardStory;

/** A loss: the gain and the curve in red, with the minus sign. Priced at yesterday’s close. */
export const Loss = {
  ...card,
  args: { ...LOSS, ...SLOTS },
} satisfies CardStory;

/** A manual share: its badge, the quantity with its decimals as entered, and the value “as of” the day of its last value point. */
export const Manual = {
  ...card,
  args: { ...MANUAL, ...SLOTS },
} satisfies CardStory;

/** A share whose prices haven’t arrived: they load in place of the curve, and the holding is not counted yet, never at €0. */
export const PricePending = {
  ...card,
  args: { ...PENDING, ...SLOTS },
} satisfies CardStory;

/** What an anonymous viewer sees: the weight in percent instead of the quantity and the value, and the gain in percent whatever the unit. */
export const Anonymous = {
  ...card,
  args: { ...SLOTS, anonymous: true, unit: "eur", actions: false },
  play: async ({ canvasElement }) => {
    const card = within(canvasElement);
    await expect(card.getByText("49.5%")).toBeVisible();
    await expect(card.queryByText(/units/)).toBeNull();
    await expect(card.queryByText("€5,904")).toBeNull();
    await expect(card.getByText("+7.7%")).toBeVisible();
  },
} satisfies CardStory;

/** The ⋯ button names the share it acts on, and opens the items the page passes. */
export const OpensItsMenu = {
  ...card,
  args: SLOTS,
  tags: ["!autodocs"],
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      within(canvasElement).getByRole("button", {
        name: "More actions for World Index ETF",
      }),
    );
    // The popup fades in: wait for its first frame to pass.
    await waitFor(() =>
      expect(page.getByRole("menuitem", { name: "Buy more" })).toBeVisible(),
    );
    await expect(page.getByRole("menuitem", { name: "Sell" })).toBeVisible();
  },
} satisfies CardStory;

/** The cash props the Cash story’s controls change. */
const CASH_PROPS = [
  "amountEur",
  "weight",
  "setOn",
  "anonymous",
  "onUpdateCash",
  "updateCashIcon",
  "timeZone",
] as const satisfies readonly (keyof CashCardProps)[];

const CASH_ARGS = {
  amountEur: "2000.00",
  weight: "16.7",
  setOn: "2026-03-01",
  anonymous: false,
  onUpdateCash: fn(),
  timeZone: "UTC",
} as const satisfies CashCardProps;

/** The Cash story’s args: the cash card’s props, its Update cash icon picked by name. */
type CashArgs = Omit<CashCardProps, "updateCashIcon"> & {
  updateCashIcon: keyof typeof LINK_ICONS;
};

/** The cash card, last after the holdings: the amount, the day it was set, and Update cash, which opens the cash step of Record a change. */
export const Cash: StoryObj<CashArgs> = {
  args: { ...CASH_ARGS, updateCashIcon: "caret-right" },
  argTypes: {
    amountEur: { control: { type: "text" } },
    weight: { control: { type: "text" } },
    setOn: { control: { type: "text" } },
    anonymous: { control: { type: "boolean" } },
    updateCashIcon: {
      control: { type: "select" },
      options: Object.keys(LINK_ICONS),
    },
    timeZone: { control: { type: "text" } },
  },
  parameters: { controls: { include: [...CASH_PROPS] } },
  render: ({
    amountEur,
    weight,
    setOn,
    anonymous,
    onUpdateCash,
    updateCashIcon,
    timeZone,
  }) => (
    <div className="max-w-[17rem]">
      <CashCard
        amountEur={amountEur}
        weight={weight}
        setOn={setOn}
        anonymous={anonymous ?? false}
        onUpdateCash={onUpdateCash}
        updateCashIcon={LINK_ICONS[updateCashIcon]}
        timeZone={timeZone}
      />
    </div>
  ),
  play: async ({ args, canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Update cash" }),
    );
    await expect(args.onUpdateCash).toHaveBeenCalledOnce();
  },
};

/** Every card of a portfolio, one column on phone, two on tablet, three on desktop, the cash last. The first set is your own; the second is what an anonymous viewer sees. */
function Portfolio() {
  const grid = cn(
    "grid gap-m",
    "grid-cols-1",
    "tablet:grid-cols-2",
    "desktop:grid-cols-3",
  );

  return (
    <div className="grid max-w-[60rem] gap-l font-sans">
      <div className={grid}>
        {[GAIN, MANUAL, LOSS, PENDING].map((holding) => (
          <HoldingCard
            key={holding.name}
            {...holding}
            link={<ShareLink />}
            actions={<Actions />}
          />
        ))}
        <CashCard {...CASH_ARGS} />
      </div>
      <div className={grid}>
        {[GAIN, MANUAL, LOSS].map((holding) => (
          <HoldingCard
            key={holding.name}
            {...holding}
            link={<ShareLink />}
            anonymous
          />
        ))}
        <CashCard {...CASH_ARGS} anonymous onUpdateCash={undefined} />
      </div>
    </div>
  );
}

/** A portfolio’s cards in their grid, your own then an anonymous viewer’s. */
export const Grid: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Portfolio />,
};

export const Phone: Story = {
  ...Grid,
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
};

export const Tablet: Story = {
  ...Grid,
  tags: ["!autodocs"],
  globals: { viewport: { value: "tablet" } },
};
