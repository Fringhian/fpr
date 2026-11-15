import type { Meta, StoryObj } from "@storybook/react-vite";
import { LoadingPlaceholder } from "./loading-placeholder";

const meta = {
  title: "Atoms/Loading placeholder",
  component: LoadingPlaceholder,
  tags: ["autodocs"],
  // Its only props are its line and its height, both set by what it stands in for.
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="max-w-[16.25rem]">
      <LoadingPlaceholder>Loading its prices…</LoadingPlaceholder>
    </div>
  ),
} satisfies Meta<typeof LoadingPlaceholder>;

export default meta;

type Story = StoryObj<typeof meta>;

/** In a holding card, in place of the curve, saying what loads. */
export const InACard: Story = {};

/** Without a line of its own, it says “Loading…”. */
export const WithoutALine: Story = {
  render: () => (
    <div className="max-w-[16.25rem]">
      <LoadingPlaceholder />
    </div>
  ),
};

/** In place of a chart, at the chart’s height. */
export const ChartHeight: Story = {
  render: () => (
    <LoadingPlaceholder className="h-[13rem] max-w-[40rem]">
      Loading this share’s history…
    </LoadingPlaceholder>
  ),
};
