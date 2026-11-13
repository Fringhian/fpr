import type { Meta, StoryObj } from "@storybook/react-vite";

const SAMPLE = "This month, you’re up €512 (+4.2%)";

function Typeface() {
  return (
    <div>
      <p className="font-normal">Regular 400 · {SAMPLE}</p>
      <p className="font-medium">Medium 500 · {SAMPLE}</p>
      <p className="font-semibold">Semibold 600 · {SAMPLE}</p>
      <p className="tabular-nums">Tabular figures · 0123456789</p>
    </div>
  );
}

const meta = {
  title: "Foundations/Typeface",
  component: Typeface,
} satisfies Meta<typeof Typeface>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figtree: Story = {};
