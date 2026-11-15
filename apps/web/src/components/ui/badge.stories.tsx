import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge, type BadgeState } from "./badge";

const STATES = [
  "manual",
  "pricePending",
  "incomplete",
  "active",
  "waitingForFirstUse",
  "revoked",
  "heldBefore",
  "saved",
] as const satisfies readonly BadgeState[];

const meta = {
  title: "Atoms/Badge",
  component: Badge,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { state: "manual" },
  argTypes: {
    state: { control: { type: "select" }, options: STATES },
  },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

/** One badge, its state picked in the Controls panel. Switch the language in the toolbar to read it in French. */
export const Playground: Story = {};

/** Every state: grey for a plain fact, green when it works, red when it needs attention, a soft fill for the past. */
export const AllStates: StoryObj = {
  name: "All states",
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center gap-s">
      {STATES.map((state) => (
        <Badge key={state} state={state} />
      ))}
    </div>
  ),
};
