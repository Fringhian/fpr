import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextLink } from "./text-link";

const DESCRIPTION = `
A link in the link colour, underlined so it never rests on colour alone. It takes the size of its text, and wraps inside a sentence.

It renders an \`<a>\` and takes every prop of one. \`render\` composes it with the router’s link: \`<TextLink render={<Link to="/help" />}>\`.
`;

const meta = {
  title: "Atoms/Text link",
  component: TextLink,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
  args: { caret: true, href: "#" },
  argTypes: {
    caret: {
      description: "Ends the link with a caret: it goes to another page.",
      control: { type: "boolean" },
      table: { defaultValue: { summary: "false" } },
    },
    href: { description: "Where the link goes.", control: false },
    render: {
      description:
        "Replaces the `<a>` with another element, such as the router’s `Link`, keeping the link’s look.",
      control: false,
    },
  },
  render: (args) => <TextLink {...args}>Open Sam’s page</TextLink>,
} satisfies Meta<typeof TextLink>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A link that goes to another page ends with a caret. */
export const ToAPage: Story = {};

/** Inside a sentence it takes the text’s size and wraps with it. */
export const InASentence: Story = {
  args: { caret: false },
  render: (args) => (
    <p className="max-w-[20rem] text-s text-secondary">
      Prices come from the markets every 30 minutes.{" "}
      <TextLink {...args}>More in How FPR works</TextLink>, with every rule the
      race follows.
    </p>
  ),
};
