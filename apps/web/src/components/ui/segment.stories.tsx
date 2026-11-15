import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { expect, userEvent, within } from "storybook/test";
import { cn } from "../../lib/cn";
import * as Segment from "./segment";

/** The segment's own props the controls change; each story fixes its options. */
interface SegmentArgs {
  backdrop: Segment.Backdrop;
  disabled: boolean;
}

const STAGES = {
  sky: "bg-sky",
  snow: "bg-page shadow-outline",
} satisfies Record<Segment.Backdrop, string>;

/** The ground the segment sits on, following its `backdrop`. */
function Stage({
  backdrop,
  children,
}: {
  backdrop: Segment.Backdrop;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-m rounded-l p-m font-sans text-primary",
        STAGES[backdrop],
      )}
    >
      {children}
    </div>
  );
}

const PERIODS = ["1D", "1W", "1M", "3M", "YTD", "all"] as const;
type Period = (typeof PERIODS)[number];

function PeriodSegment({ backdrop, disabled }: SegmentArgs) {
  const { t } = useTranslation();
  return (
    <Segment.Root<Period>
      backdrop={backdrop}
      disabled={disabled}
      defaultValue="1M"
      aria-label={t("controls.period.label")}
    >
      {PERIODS.map((period) => (
        <Segment.Item key={period} value={period}>
          {t(`controls.period.${period}`)}
        </Segment.Item>
      ))}
    </Segment.Root>
  );
}

type Unit = "euro" | "percent";

function UnitSegment({
  backdrop,
  disabled,
  anonymous = false,
}: SegmentArgs & { anonymous?: boolean }) {
  const { t } = useTranslation();
  return (
    <Segment.Root<Unit>
      backdrop={backdrop}
      disabled={disabled}
      defaultValue="percent"
      aria-label={t("controls.unit.label")}
    >
      <Segment.Item value="euro" disabled={anonymous}>
        {t("controls.unit.euro")}
      </Segment.Item>
      <Segment.Item value="percent">{t("controls.unit.percent")}</Segment.Item>
    </Segment.Root>
  );
}

type Standings = "gain" | "balance";

function StandingsSegment({ backdrop, disabled }: SegmentArgs) {
  const { t } = useTranslation();
  return (
    <Segment.Root<Standings>
      backdrop={backdrop}
      disabled={disabled}
      defaultValue="gain"
      aria-label={t("controls.standings.label")}
    >
      <Segment.Item value="gain">{t("controls.standings.gain")}</Segment.Item>
      <Segment.Item value="balance">
        {t("controls.standings.balance")}
      </Segment.Item>
    </Segment.Root>
  );
}

const LANGUAGES = ["fr", "en"] as const;
type LanguageOption = (typeof LANGUAGES)[number];

function LanguageSegment({ backdrop, disabled }: SegmentArgs) {
  const { t } = useTranslation();
  return (
    <Segment.Root<LanguageOption>
      backdrop={backdrop}
      disabled={disabled}
      defaultValue="fr"
      aria-label={t("controls.language.label")}
    >
      {LANGUAGES.map((language) => (
        // Each language is named in itself, and read in its own voice.
        <Segment.Item key={language} value={language} lang={language}>
          {t(`controls.language.${language}`)}
        </Segment.Item>
      ))}
    </Segment.Root>
  );
}

const DESCRIPTION = `
A row of capsules where one is selected in charcoal. It is Base UI’s ToggleGroup, holding one value: one option is always selected, and pressing it again changes nothing. Import it as a namespace: \`import * as Segment from "…/segment"\`.

| Part | What it is |
| --- | --- |
| \`Segment.Root\` | The track: a capsule holding the options. Takes \`backdrop\`, the selection (\`value\` with \`onValueChange\`, or \`defaultValue\`), \`disabled\`, and an \`aria-label\` that names the choice. |
| \`Segment.Item\` | One option, with its \`value\`. Grey text at rest, charcoal with white text when selected. Takes \`disabled\` for an option the person can’t pick. |

- **Backdrop**: \`sky\` sits on the peach sky, on a white track. \`snow\` sits on the page or a white surface, on a sand track.
- **Keyboard**: Tab reaches the group, the arrow keys move between its options, and Space or Enter selects the focused one.
- **Used for** the period and the unit in the page bar, Gain / Balance on the standings, and the language in Settings and the first-use steps. An anonymous viewer sees the unit on % only, with € disabled.

The controls switch the backdrop and disable the whole segment. Each story fixes its options; the language menu in the toolbar shows them in French.
`;

const meta = {
  title: "Atoms/Capsule segment",
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
  args: { backdrop: "sky", disabled: false },
  argTypes: {
    backdrop: {
      description:
        "What the segment sits on: `sky` for the peach sky, `snow` for the page or a white surface.",
      control: { type: "inline-radio" },
      options: ["sky", "snow"],
    },
    disabled: {
      description: "Disables every option.",
      control: { type: "boolean" },
    },
  },
} satisfies Meta<SegmentArgs>;

export default meta;

type Story = StoryObj<SegmentArgs>;

/**
 * The period, in the page bar on the sky. Arrow keys move the focus between
 * the options; pressing the selected one again keeps it selected.
 */
export const Period: Story = {
  render: (args) => (
    <Stage backdrop={args.backdrop}>
      <PeriodSegment {...args} />
    </Stage>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const month = canvas.getByRole("button", { name: "1M" });
    await userEvent.click(month);
    await expect(month).toHaveAttribute("aria-pressed", "true");
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("button", { name: "3M" })).toHaveFocus();
    await expect(month).toHaveAttribute("aria-pressed", "true");
  },
};

/** The unit, € or %, beside the period. */
export const Unit: Story = {
  render: (args) => (
    <Stage backdrop={args.backdrop}>
      <UnitSegment {...args} />
    </Stage>
  ),
};

/** An anonymous viewer sees amounts in % only: € stays disabled. */
export const UnitForAnAnonymousViewer: Story = {
  name: "Unit for an anonymous viewer",
  render: (args) => (
    <Stage backdrop={args.backdrop}>
      <UnitSegment {...args} anonymous />
    </Stage>
  ),
};

/** Gain / Balance, which orders the standings, on snow. */
export const GainOrBalance: Story = {
  name: "Gain / Balance",
  args: { backdrop: "snow" },
  render: (args) => (
    <Stage backdrop={args.backdrop}>
      <StandingsSegment {...args} />
    </Stage>
  ),
};

/** The language, in Settings and the first-use steps, on snow. Each language is written in itself. */
export const Language: Story = {
  args: { backdrop: "snow" },
  render: (args) => (
    <Stage backdrop={args.backdrop}>
      <LanguageSegment {...args} />
    </Stage>
  ),
};
