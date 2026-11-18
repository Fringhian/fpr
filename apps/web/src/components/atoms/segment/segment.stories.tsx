import {
  languages,
  leaderboardBoards,
  periods,
  type units,
} from "@fpr/contracts/values";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { expect, userEvent, within } from "storybook/test";
import { cn } from "../../../lib/cn";
import * as Segment from "./segment";

/** The segment's own props the controls change; each story fixes its options. */
interface SegmentArgs {
  backdrop: Segment.Backdrop;
  disabled: boolean;
  loopFocus: boolean;
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

function PeriodSegment(args: SegmentArgs) {
  const { t } = useTranslation();

  return (
    <Segment.Root<(typeof periods)[number]>
      {...args}
      defaultValue="1M"
      aria-label={t("controls.period.label")}
    >
      {periods.map((period) => (
        <Segment.Item key={period} value={period}>
          {t(`controls.period.${period}`)}
        </Segment.Item>
      ))}
    </Segment.Root>
  );
}

function UnitSegment({
  anonymous = false,
  ...args
}: SegmentArgs & { anonymous?: boolean }) {
  const { t } = useTranslation();

  return (
    <Segment.Root<(typeof units)[number]>
      {...args}
      defaultValue="percent"
      aria-label={t("controls.unit.label")}
    >
      <Segment.Item value="eur" disabled={anonymous}>
        {t("controls.unit.euro")}
      </Segment.Item>
      <Segment.Item value="percent">{t("controls.unit.percent")}</Segment.Item>
    </Segment.Root>
  );
}

function StandingsSegment(args: SegmentArgs) {
  const { t } = useTranslation();

  return (
    <Segment.Root<(typeof leaderboardBoards)[number]>
      {...args}
      defaultValue="gain"
      aria-label={t("controls.standings.label")}
    >
      {leaderboardBoards.map((board) => (
        <Segment.Item key={board} value={board}>
          {t(`controls.standings.${board}`)}
        </Segment.Item>
      ))}
    </Segment.Root>
  );
}

function LanguageSegment(args: SegmentArgs) {
  const { t } = useTranslation();

  return (
    <Segment.Root<(typeof languages)[number]>
      {...args}
      defaultValue="fr"
      aria-label={t("controls.language.label")}
    >
      {languages.map((language) => (
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
| \`Segment.Root\` | The track: a capsule holding the options. Takes \`backdrop\`, the selection (\`value\` with \`onValueChange\`, or \`defaultValue\`), and an \`aria-label\` that names the choice. Every other prop goes to Base UI’s ToggleGroup, \`className\` included: a string, or a function of the group’s state. |
| \`Segment.Item\` | One option, with its \`value\`. Grey text at rest, charcoal with white text when selected. Every other prop goes to Base UI’s Toggle, such as \`disabled\` for an option the person can’t pick. |

- **Backdrop**: \`sky\` sits on the peach sky, on a white track. \`snow\` sits on the page or a white surface, on a sand track.
- **Keyboard**: Tab reaches the group, the arrow keys move between its options, and Space or Enter selects the focused one.
- **Motion**: the charcoal glides from the last option to the one just selected, and jumps under reduced motion.
- **Used for** the period and the unit in the page bar, Gain / Balance on the standings, and the language in Settings and the first-use steps. An anonymous viewer sees the unit on % only, with € disabled.

The controls change the segment’s own props. Each story fixes its options; the language menu in the toolbar shows them in French.
`;

const meta = {
  title: "Atoms/Capsule segment",
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
  args: { backdrop: "sky", disabled: false, loopFocus: true },
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
    loopFocus: {
      description:
        "Base UI’s `loopFocus`: the arrow keys wrap from the last option to the first.",
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
