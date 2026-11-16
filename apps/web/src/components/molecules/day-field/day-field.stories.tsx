import type { IsoDate } from "@fpr/contracts";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { DayField, type DayFieldProps } from "./day-field";

/** A fixed today, so every reader sees the same month. */
const TODAY = "2026-03-18";

function Demo(args: DayFieldProps) {
  const [day, setDay] = useState<IsoDate>(args.value);

  return (
    <div className="max-w-[15rem]">
      <DayField {...args} value={day} onValueChange={setDay} />
    </div>
  );
}

const meta = {
  title: "Molecules/Day field",
  component: DayField,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A day in a form, such as the day of a manual share’s first value: its label, then a field showing the day picked, “Today” when it is `today`. It opens the calendar beside it from tablet up, and as a sheet on phone; picking a day closes it. The days after `max` can’t be picked.",
      },
    },
  },
  args: {
    label: "On",
    value: TODAY,
    max: TODAY,
    today: TODAY,
    onValueChange: () => undefined,
  },
  argTypes: {
    label: { control: "text" },
    value: { control: "text" },
    max: { control: "text" },
    today: { control: "text" },
    onValueChange: { control: false },
  },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof DayField>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Today, picked by default. */
export const Today: Story = {};

/** An earlier day, written out. */
export const EarlierDay: Story = {
  name: "Earlier day",
  args: { value: "2026-03-03" },
};

/** Opening it shows the month; picking a day closes it and shows the day. */
export const PicksADay: Story = {
  name: "Picks a day",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /On Today/ }));
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      await page.findByRole("button", { name: "3 March 2026" }),
    );
    await expect(
      canvas.getByRole("button", { name: "On 3 March" }),
    ).toBeVisible();
  },
};
