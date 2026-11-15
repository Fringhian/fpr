import type { Meta, StoryObj } from "@storybook/react-vite";
import { Chip, type ChipProps } from "./chip";

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

/** The playground's args: the picture is switched on and off. */
type PlaygroundArgs = Omit<ChipProps, "picture"> & { picture: boolean };

const meta = {
  title: "Atoms/Chip",
  component: Chip,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { children: "Swiss Pharma AG", gain: "12.4" },
  argTypes: {
    children: { control: { type: "text" } },
    gain: { control: { type: "text" } },
    picture: { control: false },
  },
} satisfies Meta<typeof Chip>;

export default meta;

/** A fixed render, with nothing to configure. */
type FixedStory = StoryObj;

/**
 * One chip, configured in the Controls panel. An empty gain leaves it out;
 * the picture control shows a placeholder until the Picture atom exists.
 */
export const Playground = {
  args: { children: "Swiss Pharma AG", gain: "12.4", picture: false },
  argTypes: {
    picture: {
      control: { type: "boolean" },
      description:
        "Renders a person's picture before the name (a placeholder in this story).",
    },
  },
  render: ({ picture, gain, ...args }) => (
    <Chip
      {...args}
      gain={gain || undefined}
      picture={
        picture ? (
          <PlaceholderPicture initial={String(args.children).charAt(0)} />
        ) : undefined
      }
    />
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
      <Chip picture={<PlaceholderPicture initial="L" />}>Lea</Chip> holds{" "}
      <Chip>World Index ETF</Chip> · star share{" "}
      <Chip gain="12.4">Swiss Pharma AG</Chip>
    </p>
  ),
};
