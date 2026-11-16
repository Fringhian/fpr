import type { Language } from "@fpr/contracts";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { formatMoney, formatPercent } from "../../../lib/format/money";
import { useLanguage } from "../../../lib/i18n";
import {
  TrailSign,
  type TrailSignPerson,
  type TrailSignProps,
} from "./trail-sign";

/** The demo words on the signs, in the toolbar’s language. They are the stories’ content, not the sign’s. */
const WORDS = {
  en: { leads: "Sam leads", you: "You" },
  fr: { leads: "Sam en tête", you: "Vous" },
} as const satisfies Record<Language, Record<string, string>>;

const SAM = {
  name: "Sam",
  color: "vermilion",
} as const satisfies TrailSignPerson;

function LeaderSign({ person }: { person: boolean }) {
  const language = useLanguage();

  return (
    <TrailSign person={person ? SAM : undefined}>
      {WORDS[language].leads}
    </TrailSign>
  );
}

/** The leader, you, and your balance, as the race and the header sentence name them. */
function Uses() {
  const language = useLanguage();

  const you = `${WORDS[language].you} ${formatPercent("4.2", language, { signed: true })}`;
  const balance = formatMoney("12374", language, { precision: "euros" });

  return (
    <div className="flex flex-wrap items-center gap-s">
      <LeaderSign person />
      <TrailSign>{you}</TrailSign>
      <TrailSign>{balance}</TrailSign>
    </div>
  );
}

/** The playground switches the person on and off. */
type PlaygroundArgs = Omit<TrailSignProps, "person" | "children"> & {
  person: boolean;
};

const meta = {
  title: "Atoms/Trail sign",
  component: TrailSign,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  // A sign stands out on the sky, where the header sentence and the race put it.
  decorators: [
    (Story) => (
      <div className="rounded-l bg-sky p-l">
        <Story />
      </div>
    ),
  ],
  args: { children: "Sam leads" },
  argTypes: {
    children: {
      description:
        "What the sign says: “Sam leads”, “You +4.2%”, “€12,374”. Fixed in these stories.",
      control: false,
    },
    person: {
      description:
        "The person the sign names, `{ name, color, photo }`: their picture, at 20 px, before the words. Without one, the sign is words alone. Sam, in vermilion, stands in for them in these stories.",
      control: { type: "boolean" },
    },
    className: {
      description: "Classes added to the sign's, which win any conflict.",
      control: false,
    },
  },
} satisfies Meta<typeof TrailSign>;

export default meta;

/** One sign, configured in the Controls panel. */
export const Playground = {
  args: { person: true },
  render: ({ person }) => <LeaderSign person={person} />,
} satisfies StoryObj<PlaygroundArgs>;

/** With a picture for a person, plain for you and for an amount. */
export const AllUses: StoryObj = {
  name: "All uses",
  parameters: { controls: { disable: true } },
  render: () => <Uses />,
};
