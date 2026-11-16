import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import * as Toast from "./toast";
import { DeleteWithUndo, EveryKind, SaveChange, TEXTS } from "./toast-story";

const text = TEXTS.en;

/** The region, rendered in the page's body. */
function region(canvasElement: HTMLElement) {
  return within(canvasElement.ownerDocument.body).getByRole("region", {
    name: "Notifications",
  });
}

const DESCRIPTION = `
A short message at the bottom of the screen about what just happened, such as a saved or deleted change. Built on Base UI's toast. Import it as a namespace: \`import * as Toast from "…/toast"\`, and show one with \`useToast()\` from \`use-toast.ts\`.

| Part | What it is |
| --- | --- |
| \`Toast.Provider\` | Holds the toasts: at most three at once, each gone after 5 s. Mounted once, around every layout. |
| \`Toast.Region\` | The region the toasts show in, mounted once per layout: the app shell and the focused pages. |
| \`Toast.Basic\` | One toast from its object: the title, the description, the action, then Dismiss. |
| \`Toast.Viewport\`, \`Root\`, \`Text\`, \`Title\`, \`Description\`, \`Action\`, \`Close\` | Its parts, for a region that draws its toasts another way. |

| \`useToast()\` | What it shows |
| --- | --- |
| \`show({ title, description })\` | A message, gone after 5 s. |
| \`offerUndo({ title, onUndo })\` | A message with Undo, gone after 8 s. Undo closes it and runs \`onUndo\`. |

- The region is a polite live region named “Notifications”: a screen reader reads each new toast once its current sentence ends. F6 moves the focus into it.
- A toast waits while the pointer is over the region or the focus is in it, and goes on once they leave.
- On phone, the toasts sit above the tab bar, full width; from tablet up, centred at the bottom. The newest is at the bottom.
- A toast rises into place and sinks out; with reduced motion, it only fades. A swipe down or sideways dismisses it.
- A deletion either happens at once and offers Undo here, or asks first in a [confirm dialog](?path=/docs/molecules-confirm-dialog--docs).
`;

const meta = {
  title: "Molecules/Toast",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: { component: DESCRIPTION },
      // Each story renders in its own frame, so its toasts sit at that frame's bottom, not the Docs page's.
      story: { inline: false, height: "24rem" },
    },
  },
  args: { limit: 3 },
  argTypes: {
    limit: {
      description:
        "The provider's `limit`: how many toasts show at once. The oldest past it hides until a newer one goes.",
      control: { type: "number", min: 1, max: 5 },
    },
  },
  decorators: [
    (Story, { args }) => (
      <Toast.Provider limit={args.limit}>
        <Story />
        <Toast.Region />
      </Toast.Provider>
    ),
  ],
  render: () => <DeleteWithUndo />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const deleteFirst = () =>
      userEvent.click(
        canvas.getByRole("button", { name: `Delete · ${text.changes[0]}` }),
      );
    await step("The region is a polite live region", async () => {
      await expect(region(canvasElement)).toHaveAttribute(
        "aria-live",
        "polite",
      );
    });
    await step("Deleting offers Undo", async () => {
      await deleteFirst();
      await expect(canvas.queryByText(text.changes[0])).toBeNull();
      const message = await within(region(canvasElement)).findByText(
        text.deleted,
      );
      // It fades in from its first frame.
      await waitFor(() => expect(message).toBeVisible());
    });
    await step("Undo puts it back and closes the toast", async () => {
      await userEvent.click(
        within(region(canvasElement)).getByRole("button", { name: "Undo" }),
      );
      await expect(await canvas.findByText(text.changes[0])).toBeVisible();
      await waitFor(() =>
        expect(
          within(region(canvasElement)).queryByText(text.deleted),
        ).toBeNull(),
      );
    });
    await step("Delete again, to show it", async () => {
      await deleteFirst();
      await within(region(canvasElement)).findByText(text.deleted);
    });
  },
} satisfies Meta<{ limit: number }>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Deleting a change happens at once and offers Undo. From tablet up, the toast is centred at the bottom. */
export const Undo: Story = { globals: { viewport: { value: "desktop" } } };

/** The Docs page can't narrow a story, so the narrower widths live in the sidebar only. */
export const UndoTablet: Story = {
  name: "Undo, tablet",
  tags: ["!autodocs"],
  globals: { viewport: { value: "tablet" } },
};

/** On phone, full width above the tab bar. */
export const UndoPhone: Story = {
  name: "Undo, phone",
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
};

/** A message, one with a second line, and one with Undo, the newest at the bottom; Dismiss closes one. */
export const EveryKindStory: Story = {
  name: "Every kind",
  render: () => <EveryKind />,
  play: async ({ canvasElement }) => {
    const toasts = within(region(canvasElement));
    await toasts.findByText(text.copied);
    await expect(
      toasts.getAllByRole("button", { name: "Dismiss" }),
    ).toHaveLength(3);
  },
};

/** The same on phone, stacked full width. */
export const EveryKindPhone: Story = {
  ...EveryKindStory,
  name: "Every kind, phone",
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
};

/** A toast waits while the pointer is on it, then goes by itself once the pointer leaves. */
export const Waits: Story = {
  name: "Waits while pointed at",
  render: () => <SaveChange timeout={1000} />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: text.save }));
    const message = await within(region(canvasElement)).findByText(text.saved);
    await step("It stays while pointed at", async () => {
      await userEvent.hover(message);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await expect(message).toBeVisible();
    });
    await step("It goes once the pointer leaves", async () => {
      await userEvent.unhover(message);
      await waitFor(
        () =>
          expect(
            within(region(canvasElement)).queryByText(text.saved),
          ).toBeNull(),
        { timeout: 4000 },
      );
    });
  },
};
