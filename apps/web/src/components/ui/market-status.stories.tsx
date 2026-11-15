import type { Meta, StoryObj } from "@storybook/react-vite";
import { MarketStatus } from "./market-status";

const meta = {
  title: "Atoms/Market status",
  component: MarketStatus,
  tags: ["autodocs"],
  // Invented times, read in UTC so every reader sees the same.
  args: {
    status: "open",
    pricedAt: "2026-03-05T14:30:00Z",
    timeZone: "UTC",
  },
  argTypes: {
    status: { control: { type: "inline-radio" }, options: ["open", "closed"] },
    pricedAt: { control: { type: "text" } },
    timeZone: { control: { type: "text" } },
  },
} satisfies Meta<typeof MarketStatus>;

export default meta;

type Story = StoryObj<typeof meta>;

/** While the markets are open: a green dot and the time of the prices. */
export const Open: Story = {};

/** After the close: a grey dot and the day of the close. */
export const Closed: Story = {
  args: { status: "closed", pricedAt: "2026-03-05T17:30:00Z" },
};
