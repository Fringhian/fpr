import type { Language } from "@fpr/contracts";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useLanguage } from "../../../lib/i18n";
import { LoadingPlaceholder } from "./loading-placeholder";

/** The demo lines, in the toolbar's language. They are the stories' content, not the placeholder's. */
const LINES = {
  en: {
    prices: "Loading its prices…",
    history: "Loading this share’s history…",
  },
  fr: {
    prices: "Chargement de ses cours…",
    history: "Chargement de l’historique de ce titre…",
  },
} as const satisfies Record<Language, Record<string, string>>;

function Line({ line }: { line: keyof (typeof LINES)["en"] }) {
  return LINES[useLanguage()][line];
}

const meta = {
  title: "Atoms/Loading placeholder",
  component: LoadingPlaceholder,
  tags: ["autodocs"],
  // Its line and its height are set by what it stands in for: demo content, fixed here.
  parameters: { controls: { disable: true } },
  argTypes: {
    children: {
      description: "The line saying what loads. “Loading…” without one.",
    },
    className: {
      description:
        "Classes added to the placeholder’s, which win any conflict: its height, in place of a chart.",
    },
  },
  render: () => (
    <div className="max-w-[16.25rem]">
      <LoadingPlaceholder>
        <Line line="prices" />
      </LoadingPlaceholder>
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
      <Line line="history" />
    </LoadingPlaceholder>
  ),
};
