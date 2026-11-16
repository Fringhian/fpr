import type { Language } from "@fpr/contracts";
import { shareKinds, units } from "@fpr/contracts/values";
import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import { DotsThreeIcon } from "@phosphor-icons/react/DotsThree";
import { DotsThreeVerticalIcon } from "@phosphor-icons/react/DotsThreeVertical";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useId } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { cn } from "../../../lib/cn";
import { useLanguage } from "../../../lib/i18n";
import { walk } from "../../../mocks/story-curves";
import * as Menu from "../menu/menu";
import * as HoldingCard from "./holding-card";

/** Invented shares, held by an invented member. */
const WORLD_INDEX = walk(11, 98.4, 0.35, 1.6);
const EURO_BANK = walk(23, 42.18, -0.1, 0.9);
const GLOBAL_TECH = walk(37, 40.1, 0.06, 0.4);

/** The demo menu items, in the toolbar’s language. They are the stories’ content, not the card’s. */
const TEXTS = {
  en: { buyMore: "Buy more", sell: "Sell", bought: "First bought on 2 March" },
  fr: {
    buyMore: "En acheter",
    sell: "Vendre",
    bought: "Premier achat le 2 mars",
  },
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
  HoldingCard.BasicProps,
  "link" | "linkIcon" | "you" | "actions" | "actionsIcon"
> & {
  link: boolean;
  linkIcon: keyof typeof LINK_ICONS;
  you: boolean;
  actions: boolean;
  actionsIcon: keyof typeof ACTIONS_ICONS;
};

/** The viewer, an invented member, when they hold the share too. */
const YOU = { name: "Alex", color: "cobalt", photo: null } as const;

/** The share page's link, as the router's `<Link>` would be: the card gives it its content. */
function ShareLink(props: ComponentProps<"a">) {
  return <a {...props} href="#share" />;
}

function Card({
  link,
  linkIcon,
  you,
  actions,
  actionsIcon,
  ...props
}: StoryArgs) {
  return (
    <div className="max-w-[17rem]">
      <HoldingCard.Basic
        {...props}
        link={link ? <ShareLink /> : undefined}
        linkIcon={LINK_ICONS[linkIcon]}
        you={you ? YOU : null}
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
} as const satisfies HoldingCard.BasicProps;

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
} as const satisfies HoldingCard.BasicProps;

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
} as const satisfies HoldingCard.BasicProps;

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
} as const satisfies HoldingCard.BasicProps;

/** The ⋯ menu and the share link, on by default: your own holding. */
const SLOTS = {
  link: true,
  linkIcon: "caret-right",
  you: false,
  actions: true,
  actionsIcon: "dots-three",
} as const satisfies Partial<StoryArgs>;

const DESCRIPTION = `
One share someone holds: its name, the quantity as entered with the latest price and its time, a curve of the price over the period, the value, and the gain over the period.

- **Your holding**: \`actions\` takes the ⋯ menu’s items, such as Buy more and Sell. The card knows no route: the page passes them. \`actionsIcon\` is the button’s icon, three dots by default.
- **link**: the router’s link to the share’s page; the whole card opens it, and the name ends with \`linkIcon\`, a caret by default.
- **Someone else’s holding**: no ⋯, and \`you\`, the viewer when they hold the share too, puts their small picture in the corner.
- **Manual** share (\`kind="manual"\`): a badge, and the price “as of” the day of its last value point.
- **Price pending** (\`latestPrice={null}\`): its prices are loading, and it is not counted yet.
- **anonymous**: the weight in percent replaces the quantity and the value, and the gain reads in percent.
- **Cash**, the last card: the cash, the day it was set, and Update cash, ended by \`updateCashIcon\`, a caret by default.

Every other prop goes to the \`<article>\`. The **Phone** and **Tablet** stories in the sidebar show the cards in a grid at the narrower widths.

\`HoldingCard.Basic\` and \`HoldingCard.Cash\` are ready-made cards. A screen with a special need composes the parts instead:

| Part | What it is |
| --- | --- |
| \`Root\` | The card, an \`<article>\`. |
| \`Header\` | The top row: the name, a badge, the ⋯ menu. |
| \`Name\` | The name, linked with \`link\` or not. |
| \`Actions\` | The ⋯ button and its menu's items. |
| \`Details\` | The quantity, the latest price and its time. |
| \`Caption\` | A small grey line. |
| \`Value\` | The curve, the value and the gain. |
| \`Pending\` | The loading prices, not counted yet. |
| \`Foot\` | The value line at the card's foot. |
| \`Figure\` | The amount, or the weight for an anonymous viewer. |
`;

const meta = {
  title: "Molecules/Holding card",
  component: HoldingCard.Basic,
  subcomponents: { Cash: HoldingCard.Cash },
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
    you: { control: { type: "boolean" }, name: "you (you hold it too)" },
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
} satisfies Meta<typeof HoldingCard.Basic>;

export default meta;

type Story = StoryObj<typeof meta>;

type CardStory = StoryObj<StoryArgs>;

/** One card, its slots switched in the Controls panel. */
const card = {
  render: (args) => <Card {...args} />,
} satisfies CardStory;

/** Your holding, up over the period: the gain and the curve in green. ⋯ opens Buy more and Sell. */
export const Gain = { ...card, args: SLOTS } satisfies CardStory;

/** Someone else’s holding, on their page: no ⋯, and the viewer’s small picture in the corner because they hold the share too. */
export const SomeoneElses = {
  ...card,
  args: { ...SLOTS, actions: false, you: true },
  play: async ({ canvasElement }) => {
    const card = within(canvasElement);
    await expect(
      card.getByRole("img", { name: "You hold it too" }),
    ).toBeVisible();
  },
} satisfies CardStory;

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
] as const satisfies readonly (keyof HoldingCard.CashProps)[];

const CASH_ARGS = {
  amountEur: "2000.00",
  weight: "16.7",
  setOn: "2026-03-01",
  anonymous: false,
  onUpdateCash: fn(),
  timeZone: "UTC",
} as const satisfies HoldingCard.CashProps;

/** The Cash story’s args: the cash card’s props, its Update cash icon picked by name. */
type CashArgs = Omit<HoldingCard.CashProps, "updateCashIcon"> & {
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
      <HoldingCard.Cash
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

/** Which optional parts the Parts story renders. */
interface PartsArgs {
  actions: boolean;
  caption: boolean;
}

/** A card composed of the parts, with its own line under the details: the day the share was first bought. */
function Composed({ actions, caption }: PartsArgs) {
  const text = TEXTS[useLanguage()];
  const nameId = useId();

  return (
    <div className="max-w-[17rem]">
      <HoldingCard.Root aria-labelledby={nameId}>
        <HoldingCard.Header>
          <HoldingCard.Name id={nameId} link={<ShareLink />}>
            {GAIN.name}
          </HoldingCard.Name>
          {actions ? (
            <HoldingCard.Actions subject={GAIN.name}>
              <Actions />
            </HoldingCard.Actions>
          ) : null}
        </HoldingCard.Header>
        <HoldingCard.Details
          quantity={GAIN.quantity}
          latestPrice={GAIN.latestPrice}
          anonymous={false}
          timeZone="UTC"
        />
        {caption ? (
          <HoldingCard.Caption>{text.bought}</HoldingCard.Caption>
        ) : null}
        <HoldingCard.Value
          name={GAIN.name}
          curve={GAIN.curve}
          valueEur={GAIN.valueEur}
          weight={GAIN.weight}
          gain={GAIN.gain}
          unit={GAIN.unit}
          anonymous={false}
        />
      </HoldingCard.Root>
    </div>
  );
}

/** The parts composed by hand, for a screen with a special need: here a line of its own under the details. */
export const Parts: StoryObj<PartsArgs> = {
  args: { actions: true, caption: true },
  argTypes: {
    actions: { control: { type: "boolean" }, name: "HoldingCard.Actions" },
    caption: { control: { type: "boolean" }, name: "HoldingCard.Caption" },
  },
  parameters: { controls: { include: ["actions", "caption"] } },
  render: (args) => <Composed {...args} />,
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
          <HoldingCard.Basic
            key={holding.name}
            {...holding}
            link={<ShareLink />}
            actions={<Actions />}
          />
        ))}
        <HoldingCard.Cash {...CASH_ARGS} />
      </div>
      <div className={grid}>
        {[GAIN, MANUAL, LOSS].map((holding) => (
          <HoldingCard.Basic
            key={holding.name}
            {...holding}
            link={<ShareLink />}
            anonymous
          />
        ))}
        <HoldingCard.Cash {...CASH_ARGS} anonymous onUpdateCash={undefined} />
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
