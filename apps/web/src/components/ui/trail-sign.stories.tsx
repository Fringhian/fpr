import type { Meta, StoryObj } from "@storybook/react-vite";
import { formatMoney, formatPercent } from "../../lib/format";
import { useLanguage } from "../../lib/i18n";
import type { Language } from "../../lib/language";
import { TrailSign, type TrailSignProps } from "./trail-sign";

/** The demo words on the signs, in the toolbar’s language. They are the stories’ content, not the sign’s. */
const WORDS = {
  en: { leads: "Sam leads", you: "You" },
  fr: { leads: "Sam en tête", you: "Vous" },
} as const satisfies Record<Language, Record<string, string>>;

/** Stands in for the Picture atom: a person's initial on their pastel, at 20 px. */
function PlaceholderPicture({ initial }: { initial: string }) {
  return (
    <span
      aria-hidden
      className="inline-flex size-[1.25rem] shrink-0 items-center justify-center rounded-full bg-vermilion-pastel text-[0.5rem] leading-none font-semibold"
    >
      {initial}
    </span>
  );
}

/** The sign that names the leader, with or without the picture part. */
function LeaderSign({ picture }: { picture: boolean }) {
  const language = useLanguage();

  return (
    <TrailSign
      picture={picture ? <PlaceholderPicture initial="S" /> : undefined}
    >
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
      <LeaderSign picture />
      <TrailSign>{you}</TrailSign>
      <TrailSign>{balance}</TrailSign>
    </div>
  );
}

/** The playground's args: the picture part is switched on and off. */
type PlaygroundArgs = Omit<TrailSignProps, "picture" | "children"> & {
  picture: boolean;
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
    picture: {
      description:
        "The person's picture, at 20 px, before the words. A placeholder stands in for it in these stories.",
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
  args: { picture: true },
  render: ({ picture }) => <LeaderSign picture={picture} />,
} satisfies StoryObj<PlaygroundArgs>;

/** With a picture for a person, plain for you and for an amount. */
export const AllUses: StoryObj = {
  name: "All uses",
  parameters: { controls: { disable: true } },
  render: () => <Uses />,
};
