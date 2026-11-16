import type { IsoDate } from "@fpr/contracts";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { expect, userEvent, within } from "storybook/test";
import { Calendar, type CalendarProps } from "./calendar";

/** The calendar holding its own pick, as a step holds it. */
function Demo(args: CalendarProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState<IsoDate>(args.value);

  return (
    <Calendar
      {...args}
      // A new starting day only applies to a new calendar.
      key={args.value}
      value={value}
      onValueChange={(day) => {
        setValue(day);
        args.onValueChange(day);
      }}
      aria-label={t("recordChange.when.calendar")}
      className="max-w-[22rem]"
    />
  );
}

const meta = {
  title: "Molecules/Calendar",
  component: Calendar,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A month of days to pick one from, Monday first, in the toolbar’s language: the month’s name with the months before and after, then its weeks. The day picked is in charcoal. The days after `max` are disabled, and so is the way to the months after its: Record a change’s When step sets it to today, so no future day can be picked. One tab stop: the arrow keys move a day or a week, Home and End to the month’s ends, Page Up and Page Down a month, and Enter or Space picks the focused day. Each day is named by its full date for screen readers, and the month’s name is announced as it changes.",
      },
    },
  },
  args: {
    value: "2026-03-03",
    max: "2026-03-09",
    onValueChange: () => undefined,
  },
  argTypes: {
    value: { description: "The day picked.", control: { type: "text" } },
    max: {
      description: "The last day that can be picked.",
      control: { type: "text" },
    },
    onValueChange: { control: false },
  },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof Calendar>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 3 March picked, with today the 9th: the days after it are disabled. */
export const Default: Story = {};

/** A month in the past: every day can be picked, and the next month too. */
export const PastMonth: Story = {
  name: "Past month",
  args: { value: "2026-01-14" },
};

/** The arrow keys move along the days and stop at `max`; Enter picks the day. */
export const Keyboard: Story = {
  tags: ["!autodocs"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Previous month, then the grid: the next month is disabled.
    await userEvent.tab();
    await userEvent.tab();
    const third = canvas.getByRole("button", {
      name: /^3 (March|mars) 2026$/,
    });
    await expect(third).toHaveFocus();
    // A week down is the 10th, after `max`: the focus stops on the 9th.
    await userEvent.keyboard("{ArrowDown}");
    const ninth = canvas.getByRole("button", {
      name: /^9 (March|mars) 2026$/,
    });
    await expect(ninth).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(ninth).toHaveAttribute("aria-pressed", "true");
  },
};
