import type { Language } from "@fpr/contracts";
import { CoinsIcon } from "@phosphor-icons/react/Coins";
import { MinusIcon } from "@phosphor-icons/react/Minus";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useId } from "react";
import { expect, userEvent, within } from "storybook/test";
import { useLanguage } from "../../../lib/i18n";
import * as Option from "./option";

/** The demo texts, in the toolbar’s language: Record a change’s first step. They are the stories’ content, not the option’s. */
const TEXTS = {
  en: {
    question: "What changed?",
    bought: "Bought shares",
    boughtLine: "Added to a holding or a new one",
    sold: "Sold shares",
    soldLine: "Part or all of a holding",
    cash: "Cash",
    cashLine: "What you hold in cash",
  },
  fr: {
    question: "Qu’est-ce qui a changé ?",
    bought: "Parts achetées",
    boughtLine: "Ajoutées à une ligne ou à une nouvelle",
    sold: "Parts vendues",
    soldLine: "Une partie ou toute une ligne",
    cash: "Liquidités",
    cashLine: "Ce que vous détenez en liquidités",
  },
} as const satisfies Record<Language, Record<string, string>>;

type Change = "bought" | "sold" | "cash";

const CHANGES = [
  { value: "bought", icon: PlusIcon, line: "boughtLine" },
  { value: "sold", icon: MinusIcon, line: "soldLine" },
  { value: "cash", icon: CoinsIcon, line: "cashLine" },
] as const satisfies ReadonlyArray<{
  value: Change;
  icon: Option.ItemProps<Change>["icon"];
  line: keyof (typeof TEXTS)["en"];
}>;

/** The story’s args: the group’s own props. */
interface QuestionArgs {
  defaultValue?: Change;
  disabled: boolean;
  readOnly: boolean;
}

/** The step’s question, its heading naming the group. */
function WhatChanged({ defaultValue, disabled, readOnly }: QuestionArgs) {
  const text = TEXTS[useLanguage()];
  const heading = useId();

  return (
    <div className="grid max-w-[30rem] gap-m font-sans text-primary">
      <h2 id={heading} className="text-xl font-semibold">
        {text.question}
      </h2>
      <Option.Group<Change>
        // A new default only applies to a new group.
        key={defaultValue ?? "none"}
        aria-labelledby={heading}
        defaultValue={defaultValue}
        disabled={disabled}
        readOnly={readOnly}
      >
        {CHANGES.map(({ value, icon, line }) => (
          <Option.Item<Change>
            key={value}
            value={value}
            icon={icon}
            title={text[value]}
            description={text[line]}
          />
        ))}
      </Option.Group>
    </div>
  );
}

/** Each state of one option. Hover and focus are drawn with the classes their states apply. */
function States() {
  const text = TEXTS[useLanguage()];

  const states = [
    { name: "Rest", className: "" },
    { name: "Hover", className: "bg-highlight" },
    { name: "Focus", className: "focus-ring" },
    { name: "Selected", className: "", defaultValue: "bought" },
    { name: "Disabled", className: "", disabled: true },
  ] as const satisfies ReadonlyArray<{
    name: string;
    className: string;
    defaultValue?: Change;
    disabled?: boolean;
  }>;

  return (
    <div className="grid max-w-[30rem] gap-l font-sans text-primary">
      {states.map((state) => (
        <section key={state.name} className="grid gap-s">
          <h2 className="text-xs text-secondary">{state.name}</h2>
          <Option.Group<Change>
            aria-label={state.name}
            defaultValue={
              "defaultValue" in state ? state.defaultValue : undefined
            }
            disabled={"disabled" in state ? state.disabled : false}
          >
            <Option.Item<Change>
              value="bought"
              icon={PlusIcon}
              title={text.bought}
              description={text.boughtLine}
              className={state.className}
            />
          </Option.Group>
        </section>
      ))}
    </div>
  );
}

const DESCRIPTION = `
One answer in a step that asks a question, such as Record a change’s “What changed?”: an icon, the answer, and one line that says what it covers. Import it as a namespace: \`import * as Option from "…/option"\`.

| Part | What it is |
| --- | --- |
| \`Option.Group\` | The answers to one question, on Base UI’s radio group. It takes \`value\` or \`defaultValue\`, \`onValueChange\`, \`disabled\`, \`readOnly\` and \`name\`, typed by the value: \`<Option.Group<Change>>\`. Name it after its question with \`aria-labelledby\`. |
| \`Option.Item\` | One answer: \`value\`, \`icon\`, \`title\` and \`description\`, one line. Selected, it is outlined in charcoal. |

- The group is one tab stop. The arrow keys move between the options and select the one they reach; Space selects the focused one.
- The options stack and fill their column, at every width.
- **States**: rest, hover (blush), the focus ring, selected (a charcoal outline), disabled.
`;

const meta = {
  title: "Molecules/Option",
  component: Option.Group,
  subcomponents: { "Option.Item": Option.Item },
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
  args: { disabled: false, readOnly: false },
  argTypes: {
    defaultValue: {
      description:
        "The answer selected at first. `value` and `onValueChange` control it instead.",
      control: { type: "inline-radio" },
      options: ["bought", "sold", "cash"],
    },
    disabled: {
      description:
        "Greys every option out and takes the group out of the tab order.",
      control: { type: "boolean" },
    },
    readOnly: {
      description: "Shows the answer without letting anyone change it.",
      control: { type: "boolean" },
    },
  },
  render: (args) => <WhatChanged {...args} />,
} satisfies Meta<QuestionArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Record a change’s first step, before an answer is chosen. */
export const Question: Story = {};

/** “Bought shares” chosen: the charcoal outline marks it. */
export const Selected: Story = { args: { defaultValue: "bought" } };

/** Every state of one option. */
export const AllStates: Story = {
  parameters: { controls: { disable: true } },
  render: () => <States />,
};

/** One tab stop: the arrow keys move along the answers and select each one they reach. */
export const Keyboard: Story = {
  args: { defaultValue: "bought" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const group = canvas.getByRole("radiogroup");
    await expect(group).toHaveAccessibleName(/What changed|Qu’est-ce/);
    const [bought, sold, cash] = canvas.getAllByRole("radio");
    await userEvent.tab();
    await expect(bought).toHaveFocus();
    await expect(bought).toHaveAttribute("aria-checked", "true");
    await userEvent.keyboard("{ArrowDown}");
    await expect(sold).toHaveFocus();
    await expect(sold).toHaveAttribute("aria-checked", "true");
    await expect(bought).toHaveAttribute("aria-checked", "false");
    await userEvent.keyboard("{ArrowDown}");
    await expect(cash).toHaveAttribute("aria-checked", "true");
    await userEvent.keyboard("{ArrowUp}");
    await expect(sold).toHaveFocus();
    await expect(sold).toHaveAttribute("aria-checked", "true");
    await userEvent.tab();
    await expect(sold).not.toHaveFocus();
    await expect(cash).not.toHaveFocus();
  },
};
