import type { Meta, StoryObj } from "@storybook/react-vite";
import { Brand } from "./brand";

const meta = {
  title: "Atoms/Brand",
  component: Brand,
  tags: ["autodocs"],
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "FPR’s name as its wordmark, in the body font, semibold and slightly spaced. It sits at the top of the sidebar, and above the steps before sign-in. It renders a `<p>`; its place on the page comes from the caller’s `className`.",
      },
    },
  },
} satisfies Meta<typeof Brand>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The wordmark on the page. */
export const Default: Story = {};
