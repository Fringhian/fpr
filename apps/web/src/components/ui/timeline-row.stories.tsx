import { CoinsIcon } from "@phosphor-icons/react/Coins";
import { DotsThreeIcon } from "@phosphor-icons/react/DotsThree";
import { DotsThreeVerticalIcon } from "@phosphor-icons/react/DotsThreeVertical";
import { MinusIcon } from "@phosphor-icons/react/Minus";
import { PencilSimpleIcon } from "@phosphor-icons/react/PencilSimple";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { StarIcon } from "@phosphor-icons/react/Star";
import { TagIcon } from "@phosphor-icons/react/Tag";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, userEvent, within } from "storybook/test";
import { useLanguage } from "../../lib/i18n";
import type { Language } from "../../lib/language";
import * as Menu from "./menu";
import {
  type TimelineEntry,
  TimelineList,
  TimelineRow,
  type TimelineRowKind,
} from "./timeline-row";

/** The icons the Controls panel offers, by name. `default` keeps the kind's own. */
const ICONS = {
  default: undefined,
  plus: PlusIcon,
  minus: MinusIcon,
  coins: CoinsIcon,
  tag: TagIcon,
  pencil: PencilSimpleIcon,
  star: StarIcon,
} as const;

/** The ⋯ button's icons the Controls panel offers, by name. */
const ACTIONS_ICONS = {
  "dots-three": DotsThreeIcon,
  "dots-three-vertical": DotsThreeVerticalIcon,
} as const;

/** The demo texts, in the toolbar's language. They are the stories' content, not the row's. */
const TEXTS = {
  en: {
    edit: "Edit",
    delete: "Delete",
    history: "History",
    values: "Values",
  },
  fr: {
    edit: "Modifier",
    delete: "Supprimer",
    history: "Historique",
    values: "Valeurs",
  },
} as const satisfies Record<Language, Record<string, string>>;

/**
 * The story's args: one control per prop of every kind, each shown on the
 * stories of the kinds that have it. `before` is empty for a first cash entry.
 */
interface TimelineRowArgs {
  kind: TimelineRowKind;
  date: string;
  share: string;
  quantity: string;
  before: string;
  after: string;
  amount: string;
  price: string;
  madeBy: string;
  year: boolean;
  icon: keyof typeof ICONS;
  actions: boolean;
  actionsIcon: keyof typeof ACTIONS_ICONS;
}

/** The kind's own fields, from the args. */
function entryOf(args: TimelineRowArgs): TimelineEntry {
  switch (args.kind) {
    case "bought":
    case "sold":
      return {
        kind: args.kind,
        share: args.share,
        quantity: args.quantity,
        before: args.before,
        after: args.after,
      };
    case "cashSet":
      return {
        kind: "cashSet",
        amount: args.amount,
        before: args.before === "" ? null : args.before,
      };
    case "valueAdded":
      return { kind: "valueAdded", price: args.price };
    case "valueEdited":
      return { kind: "valueEdited", price: args.price, before: args.before };
  }
}

/** The ⋯ menu's items, as the History page passes them: Edit, then Delete. */
function Actions() {
  const text = TEXTS[useLanguage()];

  return (
    <>
      <Menu.Item>{text.edit}</Menu.Item>
      <Menu.Separator />
      <Menu.Item intent="danger">{text.delete}</Menu.Item>
    </>
  );
}

const actions = <Actions />;

/** The white card a page puts the list in. */
function Card({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-[35rem] rounded-l bg-surface px-m py-xs font-sans shadow-outline">
      {children}
    </div>
  );
}

function Row(args: TimelineRowArgs) {
  return (
    <TimelineRow
      {...entryOf(args)}
      date={args.date}
      year={args.year}
      madeBy={args.madeBy === "" ? undefined : args.madeBy}
      icon={ICONS[args.icon]}
      actions={args.actions ? actions : undefined}
      actionsIcon={ACTIONS_ICONS[args.actionsIcon]}
    />
  );
}

/** A row of a sample list: its entry, its day, who made it, and a key. */
type HistoryEntry = TimelineEntry & {
  id: string;
  date: string;
  madeBy?: string;
};

/** A member's history, newest first: the History page's rows. */
const HISTORY: HistoryEntry[] = [
  {
    id: "1",
    date: "2026-03-03",
    kind: "bought",
    share: "World Index ETF",
    quantity: "10",
    before: "50",
    after: "60",
  },
  {
    id: "2",
    date: "2026-03-01",
    kind: "cashSet",
    amount: "2000",
    before: "2400",
  },
  {
    id: "3",
    date: "2026-02-24",
    kind: "sold",
    share: "US Health ETF",
    quantity: "5",
    before: "12",
    after: "7",
  },
  {
    id: "4",
    date: "2026-02-12",
    kind: "bought",
    share: "Nordic Wind AG",
    quantity: "4",
    before: "0",
    after: "4",
    madeBy: "Alex",
  },
  {
    id: "5",
    date: "2026-02-02",
    kind: "bought",
    share: "Global Tech Fund",
    quantity: "74.328",
    before: "0",
    after: "74.328",
    madeBy: "Alex",
  },
  {
    id: "6",
    date: "2026-01-12",
    kind: "cashSet",
    amount: "2400",
    before: null,
  },
];

/** A manual share's values, newest first, each with who entered it. */
const VALUES: HistoryEntry[] = [
  {
    id: "1",
    date: "2026-03-03",
    kind: "valueEdited",
    price: "40.10",
    before: "41.00",
    madeBy: "Lea",
  },
  {
    id: "2",
    date: "2026-02-14",
    kind: "valueAdded",
    price: "41.00",
    madeBy: "Alex",
  },
  {
    id: "3",
    date: "2026-01-02",
    kind: "valueAdded",
    price: "38.60",
    madeBy: "Sam",
  },
];

function List({
  entries,
  label,
  withActions,
  actionsIcon,
}: {
  entries: HistoryEntry[];
  label: "history" | "values";
  withActions: boolean;
  actionsIcon: keyof typeof ACTIONS_ICONS;
}) {
  const text = TEXTS[useLanguage()];

  return (
    <Card>
      <TimelineList aria-label={text[label]}>
        {entries.map(({ id, ...entry }) => (
          <TimelineRow
            key={id}
            {...entry}
            actions={withActions ? actions : undefined}
            actionsIcon={ACTIONS_ICONS[actionsIcon]}
          />
        ))}
      </TimelineList>
    </Card>
  );
}

const DESCRIPTION = `
One recorded change or value, in a list: the History page's share changes and cash balances, and a manual share's values. Each row has the date, the kind's icon in a soft circle, what happened, the before → after under it, and the ⋯ menu.

| Part | What it is |
| --- | --- |
| \`TimelineList\` | The \`<ol>\` the rows go in, newest first, each row ruled off from the next. |
| \`TimelineRow\` | One \`<li>\`. \`kind\` picks what it records, and the fields that kind needs. |

| \`kind\` | Fields | Reads |
| --- | --- | --- |
| \`bought\` | \`share\`, \`quantity\`, \`before\`, \`after\` | “Bought 10 World Index ETF”, “50 → 60”, or “New holding” from zero |
| \`sold\` | \`share\`, \`quantity\`, \`before\`, \`after\` | “Sold 5 US Health ETF”, “12 → 7” |
| \`cashSet\` | \`amount\`, \`before\` (\`null\` for the first) | “Cash set to €2,000.00”, “was €2,400.00” or “First cash entry” |
| \`valueAdded\` | \`price\` | “Value of €38.60 added” |
| \`valueEdited\` | \`price\`, \`before\` | “Value changed to €40.10”, “was €41.00” |

- \`madeBy\` adds “by Alex” after the change: on a member's entry the admin made, and on every value of a manual share.
- \`actions\` takes the menu's \`Menu.Item\`s, such as Edit and Delete. The ⋯ button is named after the row for screen readers: “More actions for Bought 10 World Index ETF, 3 Mar”. Without actions, a read-only viewer's row has no ⋯.
- \`icon\` swaps the kind's icon: plus, minus, coins, tag, pencil by default. \`actionsIcon\` swaps the ⋯ button's three dots.
- Screen readers hear “from 50 to 60 units held” for the arrow.

The **Phone** and **Tablet** stories in the sidebar show the narrower widths, and **Actions** opens the menu.
`;

const meta = {
  title: "Molecules/Timeline row",
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: DESCRIPTION } },
  },
  args: {
    kind: "bought",
    date: "2026-03-03",
    share: "World Index ETF",
    quantity: "10",
    before: "50",
    after: "60",
    amount: "2000",
    price: "40.10",
    madeBy: "",
    year: false,
    icon: "default",
    actions: true,
    actionsIcon: "dots-three",
  },
  argTypes: {
    kind: {
      description:
        "What the row records. Each story is one kind, with that kind's fields.",
      control: false,
      table: {
        type: {
          summary:
            '"bought" | "sold" | "cashSet" | "valueAdded" | "valueEdited"',
        },
      },
    },
    date: {
      description: "The day, `YYYY-MM-DD`, or a timestamp.",
      control: { type: "text" },
    },
    share: {
      description: "`bought`, `sold`: the share's name.",
      control: { type: "text" },
    },
    quantity: {
      description: "`bought`, `sold`: the units, a decimal string.",
      control: { type: "text" },
    },
    before: {
      description:
        "`bought`, `sold`: the units held just before; `0` on a purchase reads “New holding”. `cashSet`: the cash before, empty here for the first entry (`null`). `valueEdited`: the value before.",
      control: { type: "text" },
    },
    after: {
      description: "`bought`, `sold`: the units held just after.",
      control: { type: "text" },
    },
    amount: {
      description: "`cashSet`: the cash from that day, in euros.",
      control: { type: "text" },
    },
    price: {
      description: "`valueAdded`, `valueEdited`: one unit's value, in euros.",
      control: { type: "text" },
    },
    madeBy: {
      description: "Who made it, written “by Alex”. Empty here for nobody.",
      control: { type: "text" },
    },
    year: {
      description: "Adds the year to the date: “3 Mar 2026”.",
      control: { type: "boolean" },
    },
    icon: {
      description: "Another icon than the kind's. `default` keeps the kind's.",
      options: Object.keys(ICONS),
      control: { type: "select" },
    },
    actions: {
      description:
        "The ⋯ menu's `Menu.Item`s. On here, Edit and Delete; off, no ⋯.",
      control: { type: "boolean" },
    },
    actionsIcon: {
      description:
        "The ⋯ button's icon: any Phosphor icon, three dots by default.",
      options: Object.keys(ACTIONS_ICONS),
      control: { type: "select" },
      if: { arg: "actions" },
    },
  },
  render: (args) => (
    <Card>
      <TimelineList>
        <Row {...args} />
      </TimelineList>
    </Card>
  ),
} satisfies Meta<TimelineRowArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

const COMMON = ["date", "madeBy", "year", "icon", "actions", "actionsIcon"];

const holdingControls = {
  controls: {
    include: ["share", "quantity", "before", "after", ...COMMON],
  },
};

/** Shares bought: the holding before → after. */
export const Bought: Story = {
  parameters: holdingControls,
};

/** A purchase from zero starts a new holding. */
export const NewHolding: Story = {
  name: "New holding",
  args: {
    date: "2026-02-02",
    share: "Global Tech Fund",
    quantity: "74.328",
    before: "0",
    after: "74.328",
  },
  parameters: holdingControls,
};

/** Shares sold: the holding before → after. */
export const Sold: Story = {
  args: {
    kind: "sold",
    date: "2026-02-24",
    share: "US Health ETF",
    quantity: "5",
    before: "12",
    after: "7",
  },
  parameters: holdingControls,
};

/** Cash set from a day, with the cash it replaced. Empty `before` for the first entry. */
export const CashSet: Story = {
  name: "Cash set",
  args: { kind: "cashSet", date: "2026-03-01", amount: "2000", before: "2400" },
  parameters: { controls: { include: ["amount", "before", ...COMMON] } },
};

/** A value added to a manual share, with who entered it. */
export const ValueAdded: Story = {
  name: "Value added",
  args: {
    kind: "valueAdded",
    date: "2026-02-14",
    price: "41.00",
    madeBy: "Alex",
  },
  parameters: { controls: { include: ["price", ...COMMON] } },
};

/** A manual share's value changed, with the value it had. */
export const ValueEdited: Story = {
  name: "Value edited",
  args: {
    kind: "valueEdited",
    date: "2026-03-03",
    price: "40.10",
    before: "41.00",
    madeBy: "Lea",
  },
  parameters: { controls: { include: ["price", "before", ...COMMON] } },
};

/** A member's entry the admin made for them: who made it follows the change. */
export const MadeByTheAdmin: Story = {
  name: "Made by the admin",
  args: { madeBy: "Alex" },
  parameters: holdingControls,
};

/** The History page's list: share changes and cash balances, newest first, two prepared by the admin. */
export const History: Story = {
  parameters: { controls: { include: ["actions", "actionsIcon"] } },
  render: (args) => (
    <List
      entries={HISTORY}
      label="history"
      withActions={args.actions}
      actionsIcon={args.actionsIcon}
    />
  ),
};

/** A manual share's values, newest first, each with who entered it. */
export const Values: Story = {
  parameters: { controls: { include: ["actions", "actionsIcon"] } },
  render: (args) => (
    <List
      entries={VALUES}
      label="values"
      withActions={args.actions}
      actionsIcon={args.actionsIcon}
    />
  ),
};

/** ⋯ opens the actions passed in, and is named after its row. */
export const ActionsMenu: Story = {
  name: "Actions",
  tags: ["!autodocs"],
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const trigger = within(canvasElement).getByRole("button", {
      name: "More actions for Bought 10 World Index ETF, 3 Mar",
    });
    await userEvent.click(trigger);
    const menu = await page.findByRole("menu");
    const items = within(menu).getAllByRole("menuitem");
    await expect(items.map((item) => item.textContent)).toEqual([
      "Edit",
      "Delete",
    ]);
  },
};

/** The Docs page can't narrow a story, so the narrower widths live in the sidebar only. */
export const Phone: Story = {
  ...History,
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
};

export const Tablet: Story = {
  ...History,
  tags: ["!autodocs"],
  globals: { viewport: { value: "tablet" } },
};
