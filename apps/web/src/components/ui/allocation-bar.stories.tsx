import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, within } from "storybook/test";
import type { AllocationHolding } from "../../lib/allocation";
import { cn } from "../../lib/cn";
import { MEMBER_COLORS } from "../../lib/member-color";
import { AllocationBar, type AllocationBarProps } from "./allocation-bar";

function holding(name: string, weight: string | null): AllocationHolding {
  return { id: name.toLowerCase().replaceAll(" ", "-"), name, weight };
}

/** Invented portfolios, each with its cash. Their weights add up to 100. */
const PORTFOLIOS = {
  two: {
    holdings: [
      holding("World Index ETF", "58.4"),
      holding("Global Tech Fund", "25.4"),
    ],
    cashWeight: "16.2",
  },
  five: {
    holdings: [
      holding("World Index ETF", "32.5"),
      holding("Global Tech Fund", "18.6"),
      holding("US Health ETF", "14.2"),
      holding("Euro Bank SA", "11.3"),
      holding("Alpine Rail AG", "7.2"),
    ],
    cashWeight: "16.2",
  },
  eight: {
    holdings: [
      holding("World Index ETF", "24.0"),
      holding("Global Tech Fund", "15.5"),
      holding("US Health ETF", "12.2"),
      holding("Euro Bank SA", "9.8"),
      holding("Alpine Rail AG", "7.4"),
      holding("Swiss Pharma AG", "6.1"),
      holding("Asia Dividend ETF", "4.6"),
      holding("Nordic Wind AG", "2.2"),
    ],
    cashWeight: "18.2",
  },
  pending: {
    holdings: [
      holding("World Index ETF", "57.3"),
      holding("Global Tech Fund", "28.9"),
      holding("US Health ETF", "13.8"),
      holding("Nordic Wind AG", null),
    ],
    cashWeight: null,
  },
} as const satisfies Record<
  string,
  { holdings: readonly AllocationHolding[]; cashWeight: string | null }
>;

type PortfolioName = keyof typeof PORTFOLIOS;

/** The stories' args: the holdings are picked by name, and the cash is typed, empty for none. */
type AllocationBarArgs = Omit<AllocationBarProps, "holdings" | "cashWeight"> & {
  holdings: PortfolioName;
  cashWeight: string;
};

function toProps({
  holdings,
  cashWeight,
  ...args
}: AllocationBarArgs): AllocationBarProps {
  return {
    ...args,
    holdings: PORTFOLIOS[holdings].holdings,
    cashWeight: cashWeight.trim() === "" ? null : cashWeight,
  };
}

/** A card, as on the Portfolio and member pages, so the gaps between parts show the surface. */
function Card({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-[40rem] rounded-l bg-surface p-m font-sans shadow-rest">
      {children}
    </div>
  );
}

const DESCRIPTION = `
How a portfolio splits between its shares and its cash, on the Portfolio page and a member’s page.

- The biggest share is drawn in the person’s colour, and each smaller one lighter, in even steps towards the surface. The cash is grey, last.
- The key names every part with its percentage, so no part rests on colour alone. The bar itself is hidden from screen readers; the key, a list, carries it.
- Past five shares, the rest fold into “Other”, the lightest part.
- Each weight is in percent of the parts’ total, rounded to one decimal so the key adds up to 100.0%. \`allocate\` in \`src/lib/allocation.ts\` computes them.
- A share whose price is pending (\`weight: null\`) is left out, like the balance leaves it out. With nothing to split, it renders nothing.
- It reads weights only, never amounts, so an anonymous viewer sees the same bar.

The **Phone** story in the sidebar shows the key wrapping at 375 px.
`;

const meta = {
  title: "Molecules/Allocation bar",
  component: AllocationBar,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
} satisfies Meta<typeof AllocationBar>;

export default meta;

/** Every story's args, controls and render: one bar, configured in the Controls panel. */
const configurable = {
  args: { color: "cobalt", holdings: "five", cashWeight: "16.2" },
  argTypes: {
    color: {
      control: { type: "select" },
      options: MEMBER_COLORS,
      table: { type: { summary: "MemberColor" } },
    },
    holdings: {
      description:
        "The person’s holdings, each `{ id, name, weight }`, its weight in percent of the balance, or `null` while its price is pending. Here, picked by name: two, five or eight holdings, or three with a pending one.",
      control: { type: "inline-radio" },
      options: Object.keys(PORTFOLIOS),
      table: { type: { summary: "readonly AllocationHolding[]" } },
    },
    cashWeight: {
      description:
        "The cash’s weight in percent of the balance, or `null` with no cash. Here, empty for none.",
      control: { type: "text" },
      table: { type: { summary: "Decimal | null" } },
    },
    className: {
      description:
        "Classes added to the bar’s outer `<div>`, which win any conflict. Every other `<div>` prop goes there too.",
      control: false,
    },
  },
  render: (args) => (
    <Card>
      <AllocationBar {...toProps(args)} />
    </Card>
  ),
} satisfies StoryObj<AllocationBarArgs>;

type Story = StoryObj<AllocationBarArgs>;

/** One bar, configured in the Controls panel. */
export const Playground: Story = { ...configurable };

/** Two shares and the cash. */
export const TwoHoldings: Story = {
  ...configurable,
  name: "Two holdings",
  args: { ...configurable.args, holdings: "two", cashWeight: "16.2" },
};

/** Five shares, each named. */
export const FiveHoldings: Story = {
  ...configurable,
  name: "Five holdings",
  args: { ...configurable.args, holdings: "five", cashWeight: "16.2" },
};

/** Eight shares: the five biggest are named, the other three fold into “Other”. */
export const EightHoldings: Story = {
  ...configurable,
  name: "Eight holdings",
  args: { ...configurable.args, holdings: "eight", cashWeight: "18.2" },
  play: async ({ canvasElement }) => {
    const key = within(canvasElement).getByRole("list");
    const items = within(key).getAllByRole("listitem");
    // Five shares, Other with the three smallest, then the cash.
    await expect(items).toHaveLength(7);
    await expect(items[5]).toHaveTextContent(/12[.,]9/);
    await expect(items[6]).toHaveTextContent(/18[.,]2/);
  },
};

/** No cash, and a share whose price is pending: it is left out until it has one. */
export const PendingShareNoCash: Story = {
  ...configurable,
  name: "Pending share, no cash",
  args: { ...configurable.args, holdings: "pending", cashWeight: "" },
};

/** The same five shares in every member colour, each lighter step still apart from the next. */
export const EveryColour: Story = {
  name: "Every colour",
  parameters: { controls: { disable: true } },
  render: () => (
    <div
      className={cn(
        "grid gap-m",
        "grid-cols-1",
        "tablet:grid-cols-2",
        "desktop:grid-cols-2",
      )}
    >
      {MEMBER_COLORS.map((color) => (
        <Card key={color}>
          <p className="mb-s text-xs font-medium text-primary">{color}</p>
          <AllocationBar color={color} {...PORTFOLIOS.five} />
        </Card>
      ))}
    </div>
  ),
};

/** On a phone, the key wraps under the bar. */
export const Phone: Story = {
  ...EightHoldings,
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
};
