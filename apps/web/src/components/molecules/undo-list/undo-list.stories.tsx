import type { Language } from "@fpr/contracts";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { useLanguage } from "../../../lib/i18n";
import { UndoList } from "./undo-list";

/** The demo texts, in the toolbar’s language: a week of changes recorded in one sitting. They are the stories’ content, not the list’s. */
const TEXTS = {
  en: {
    title: "This session",
    changes: [
      "Sold 5 US Health ETF · 2 Mar",
      "Bought 10 World Index ETF · 3 Mar",
      "Cash set to €1,500.00 · 3 Mar",
    ],
  },
  fr: {
    title: "Cette session",
    changes: [
      "5 US Health ETF vendus · 2 mars",
      "10 World Index ETF achetés · 3 mars",
      "Liquidités fixées à 1 500,00 € · 3 mars",
    ],
  },
} as const satisfies Record<
  Language,
  { title: string; changes: readonly string[] }
>;

/** The story’s args: the first change already undone, the second’s Undo on its way. */
type ListArgs = { undone: boolean; busy: boolean };

/** The list, each Undo marking its item undone. */
function Demo({ undone, busy }: ListArgs) {
  const text = TEXTS[useLanguage()];
  const [pressed, setPressed] = useState<readonly string[]>([]);

  return (
    <UndoList
      title={text.title}
      className="max-w-[30rem]"
      items={text.changes.map((label, index) => ({
        id: String(index),
        label,
        undone: (undone && index === 0) || pressed.includes(String(index)),
        busy: busy && index === 1,
      }))}
      onUndo={(id) => setPressed((ids) => [...ids, id])}
    />
  );
}

const meta = {
  title: "Molecules/Undo list",
  component: Demo,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "What was just done, oldest first, each with Undo at its end: the changes saved in one sitting of Record a change. An item undone is struck through and says “Undone” in place of Undo, so the list keeps its rows. Undo waits while its write is on its way. Each Undo is described by its item, so screen readers hear what it undoes.",
      },
    },
  },
  args: { undone: false, busy: false },
  argTypes: {
    undone: {
      name: "Undone item",
      description: "The first item is already undone.",
      control: { type: "boolean" },
    },
    busy: {
      name: "Busy item",
      description: "The second item’s Undo is on its way.",
      control: { type: "boolean" },
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Three changes saved, each with Undo. */
export const Default: Story = {};

/** The first change undone, the second’s Undo on its way. */
export const States: Story = { args: { undone: true, busy: true } };

/** Undo marks its item undone. */
export const PressUndo: Story = {
  name: "Press Undo",
  tags: ["!autodocs"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [first] = canvas.getAllByRole("button");
    if (first) await userEvent.click(first);
    await expect(canvas.getAllByRole("button")).toHaveLength(2);
  },
};
