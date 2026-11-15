import type { Meta, StoryObj } from "@storybook/react-vite";
import { StepProgress } from "./step-progress";

const meta = {
  title: "Atoms/Step progress",
  component: StepProgress,
  tags: ["autodocs"],
  args: { step: 2, count: 4 },
  argTypes: {
    step: { control: { type: "range", min: 1, max: 6, step: 1 } },
    count: { control: { type: "range", min: 2, max: 6, step: 1 } },
    className: { control: false },
  },
  // It fills the width it is given: here, a step flow's column.
  render: (args) => (
    <div className="max-w-[25rem]">
      <StepProgress {...args} />
    </div>
  ),
} satisfies Meta<typeof StepProgress>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The second of four steps: its segment and the one before are filled. */
export const SecondStep: Story = {};

/** The first step fills one segment. */
export const FirstStep: Story = { args: { step: 1 } };

/** The last step fills them all. */
export const LastStep: Story = { args: { step: 4 } };
