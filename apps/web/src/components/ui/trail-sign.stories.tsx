import type { Meta, StoryObj } from "@storybook/react-vite";
import { formatMoney, formatPercent } from "../../lib/format";
import { useLanguage } from "../../lib/i18n";
import { TrailSign, type TrailSignProps } from "./trail-sign";

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

/** The leader, you, and your balance, as the race and the header sentence name them. */
function Uses() {
  const language = useLanguage();
  return (
    <div className="flex flex-wrap items-center gap-s">
      <TrailSign picture={<PlaceholderPicture initial="S" />}>
        Sam leads
      </TrailSign>
      <TrailSign>
        You {formatPercent("4.2", language, { signed: true })}
      </TrailSign>
      <TrailSign>
        {formatMoney("12374", language, { precision: "euros" })}
      </TrailSign>
    </div>
  );
}

/** The playground's args: the picture is switched on and off. */
type PlaygroundArgs = Omit<TrailSignProps, "picture"> & { picture: boolean };

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
    children: { control: { type: "text" } },
    picture: { control: false },
  },
} satisfies Meta<typeof TrailSign>;

export default meta;

/** One sign, configured in the Controls panel. The picture control shows a placeholder until the Picture atom exists. */
export const Playground = {
  args: { children: "Sam leads", picture: true },
  argTypes: {
    picture: {
      control: { type: "boolean" },
      description:
        "Renders a person's picture before the words (a placeholder in this story).",
    },
  },
  render: ({ picture, ...args }) => (
    <TrailSign
      {...args}
      picture={
        picture ? (
          <PlaceholderPicture initial={String(args.children).charAt(0)} />
        ) : undefined
      }
    />
  ),
} satisfies StoryObj<PlaygroundArgs>;

/** With a picture for a person, plain for you and for an amount. */
export const AllUses: StoryObj = {
  name: "All uses",
  parameters: { controls: { disable: true } },
  render: () => <Uses />,
};
