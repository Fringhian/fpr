import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { OneTimeSecret } from "./one-time-secret";

/** An invented link and key, in the shape of real ones. */
const LINK =
  "https://fpr.example.com/access/x7Gk2mQp9TsVw4bN8cRf1LhYz6DjEo3Ua5KiWq0Pq2A";
const RESET_KEY = "4F7KQ2M9XB6T1RZC";

const DESCRIPTION = `
A secret shown once, such as a person's access link or reset key: read-only and in full, with Copy at its end. It is a field, so its label names the secret above it.

- Copy puts the secret on the clipboard, turns into “Copied”, and the line under it says so.
- When the browser refuses to copy, the text is selected, to copy by hand, and the line under it says so.
- Focusing the field selects the whole secret.
- Where it goes says that it isn't shown again, and what to do once it's lost.
`;

const meta = {
  title: "Molecules/One-time secret",
  component: OneTimeSecret,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
  args: { label: "Access link", value: LINK },
  argTypes: {
    label: { control: { type: "text" } },
    value: { control: { type: "text" } },
    onCopied: { control: false },
    focusCopy: { control: { type: "boolean" } },
    className: { control: false },
  },
  decorators: [
    (Story) => (
      <div className="max-w-[30rem] font-sans">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OneTimeSecret>;

export default meta;

type Story = StoryObj<typeof meta>;

/** An access link, the longest secret: it scrolls inside the field. */
export const AccessLink: Story = {};

/** A reset key. */
export const ResetKey: Story = {
  args: { label: "Reset key", value: RESET_KEY },
};

/** Puts a clipboard that answers `writeText` this way, and gives back the browser's after the story. */
function stubClipboard(writeText: () => Promise<void>) {
  return () => {
    const { clipboard } = navigator;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    return () => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: clipboard,
      });
    };
  };
}

/** Copy works: the button says Copied, and the line under it says the clipboard holds it. */
export const Copied: Story = {
  tags: ["!autodocs"],
  beforeEach: stubClipboard(() => Promise.resolve()),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Copy" }));
    await expect(
      await canvas.findByRole("button", { name: "Copied" }),
    ).toBeVisible();
  },
};

/** The browser refuses to copy: the secret is selected, to copy by hand. */
export const CopyRefused: Story = {
  name: "Copy refused",
  tags: ["!autodocs"],
  beforeEach: stubClipboard(() => Promise.reject(new Error("Not allowed"))),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const field = canvas.getByRole<HTMLInputElement>("textbox");
    await userEvent.click(canvas.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(field).toHaveFocus());
    await expect(
      field.value.slice(field.selectionStart ?? 0, field.selectionEnd ?? 0),
    ).toBe(LINK);
    await expect(
      canvas.getByText(
        "Your browser didn’t copy it. It’s selected: copy it by hand.",
      ),
    ).toBeVisible();
  },
};
