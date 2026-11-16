import type { Meta, StoryObj } from "@storybook/react-vite";
import { MEMBER_COLORS } from "../../../lib/member-color";
import { PictureStack } from "./picture-stack";

/** Invented members, one per colour. */
const PEOPLE = ["Sam", "Alex", "Lea", "Noor", "Max", "Tom", "Ines", "Hugo"].map(
  (name, index) => ({
    id: `p${index}`,
    name,
    color: MEMBER_COLORS[index % MEMBER_COLORS.length] ?? "vermilion",
    photo: null,
  }),
);

const meta = {
  title: "Molecules/Picture stack",
  component: PictureStack,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A few people’s small pictures, overlapping in a row: a share’s holders on its card. Past `max` places, the last one counts the others, “+4”. A list named by `label`, each picture named by its person.",
      },
    },
  },
  args: { people: PEOPLE.slice(0, 4), max: 5, label: "Who holds it" },
  argTypes: {
    people: { control: false },
    max: { control: { type: "range", min: 2, max: 8 } },
    label: { control: "text" },
  },
} satisfies Meta<typeof PictureStack>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Fewer people than places: every picture shows. */
export const Few: Story = {};

/** More people than places: the last place counts the others. */
export const Many: Story = { args: { people: PEOPLE } };
