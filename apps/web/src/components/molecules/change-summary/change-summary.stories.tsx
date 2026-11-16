import type { Language } from "@fpr/contracts";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useLanguage } from "../../../lib/i18n";
import { ChangeSummary } from "./change-summary";

/** The demo texts, in the toolbar’s language: a sale being recorded. They are the stories’ content, not the summary’s. */
const TEXTS = {
  en: {
    title: "This change",
    terms: ["What", "Share", "When", "How many"],
    values: ["Sold", "World Index ETF", "3 March", "30"],
  },
  fr: {
    title: "Ce changement",
    terms: ["Quoi", "Action", "Quand", "Combien"],
    values: ["Vendu", "World Index ETF", "3 mars", "30"],
  },
} as const satisfies Record<
  Language,
  { title: string; terms: readonly string[]; values: readonly string[] }
>;

/** The story’s args: how many answers the flow has so far. */
type SummaryArgs = { answered: number };

function Demo({ answered }: SummaryArgs) {
  const text = TEXTS[useLanguage()];

  return (
    <ChangeSummary
      title={text.title}
      rows={text.terms.map((term, index) => ({
        term,
        value: index < answered ? text.values[index] : null,
      }))}
    />
  );
}

const meta = {
  title: "Molecules/Change summary",
  component: ChangeSummary,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "What a flow knows so far, on a white card: Record a change’s sky panel on desktop. One row per answer, in the flow’s order; an answer not chosen yet is a dash, heard as “not chosen yet”. It takes the panel’s width up to 420 px.",
      },
    },
  },
  args: { title: "", rows: [] },
  argTypes: {
    title: { control: false },
    rows: { control: false },
  },
  render: () => <Demo answered={4} />,
} satisfies Meta<typeof ChangeSummary>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Every answer given: the step before the review. */
export const Complete: Story = {};

/** Two answers so far: the rest are dashes. */
export const InProgress: Story = {
  name: "In progress",
  render: () => <Demo answered={2} />,
};
