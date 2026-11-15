import type { Meta, StoryObj } from "@storybook/react-vite";
import { useLanguage } from "../../../lib/i18n";
import type { Language } from "../../../lib/language";
import { Chip, type ChipProps } from "./chip";

/** The demo words around the chips, in the toolbar’s language. They are the stories’ content, not the chip’s. */
const WORDS = {
  en: { holds: "holds", starShare: "· star share" },
  fr: { holds: "détient", starShare: "· action vedette" },
} as const satisfies Record<Language, Record<string, string>>;

function Words({ word }: { word: keyof (typeof WORDS)["en"] }) {
  return WORDS[useLanguage()][word];
}

/** Stands in for the Picture atom: a person's initial on their pastel, at 20 px. */
function PlaceholderPicture({ initial }: { initial: string }) {
  return (
    <span
      aria-hidden
      className="inline-flex size-[1.25rem] shrink-0 items-center justify-center rounded-full bg-green-pastel text-[0.5rem] leading-none font-semibold"
    >
      {initial}
    </span>
  );
}

/** The playground's args: the picture part is switched on and off. */
type PlaygroundArgs = Omit<ChipProps, "picture" | "children"> & {
  picture: boolean;
};

const meta = {
  title: "Atoms/Chip",
  component: Chip,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { children: "Swiss Pharma AG", gain: "12.4" },
  argTypes: {
    children: {
      description:
        "What the chip names: a share, a person, an ISIN. Fixed in these stories.",
      control: false,
    },
    gain: { control: { type: "text" } },
    picture: {
      description:
        "The person's picture, at 20 px, before their name. A placeholder stands in for it in these stories.",
      control: { type: "boolean" },
    },
    className: {
      description: "Classes added to the chip's, which win any conflict.",
      control: false,
    },
  },
} satisfies Meta<typeof Chip>;

export default meta;

/** A fixed render, with nothing to configure. */
type FixedStory = StoryObj;

/**
 * One chip, configured in the Controls panel: a share, or a person once the
 * picture is on. An empty gain leaves it out.
 */
export const Playground = {
  args: { gain: "12.4", picture: false },
  render: ({ picture, gain, ...args }) => (
    <Chip
      {...args}
      gain={gain || undefined}
      picture={picture ? <PlaceholderPicture initial="L" /> : undefined}
    >
      {picture ? "Lea" : "Swiss Pharma AG"}
    </Chip>
  ),
} satisfies StoryObj<PlaygroundArgs>;

/** A share with its gain or its loss, a person, an ISIN. */
export const Uses: FixedStory = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center gap-s">
      <Chip gain="12.4">Swiss Pharma AG</Chip>
      <Chip gain="-1.3">Nordic Wind AG</Chip>
      <Chip picture={<PlaceholderPicture initial="L" />}>Lea</Chip>
      <Chip>IE00EXMPL001</Chip>
    </div>
  ),
};

/**
 * In a sentence, a chip sits on the line of the words around it. The
 * sentence's lines are 1.8 times its text size apart, so chips on two lines
 * never touch.
 */
export const InASentence: FixedStory = {
  name: "In a sentence",
  parameters: { controls: { disable: true } },
  render: () => (
    <p className="max-w-[30rem] text-m leading-[1.8] text-primary">
      <Chip picture={<PlaceholderPicture initial="L" />}>Lea</Chip>{" "}
      <Words word="holds" /> <Chip>World Index ETF</Chip>{" "}
      <Words word="starShare" /> <Chip gain="12.4">Swiss Pharma AG</Chip>
    </p>
  ),
};
