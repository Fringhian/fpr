import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { DeleteChange, DeletePerson, TEXTS } from "./confirm-dialog-story";
import { LEAVE_TEXTS, LeavingAForm } from "./leave-guard-story";

const text = TEXTS.en;

/** The story's page and the overlays above it, which render in the page's body. */
function screen(canvasElement: HTMLElement) {
  return within(canvasElement.ownerDocument.body);
}

const gone = (canvasElement: HTMLElement) =>
  waitFor(() =>
    expect(screen(canvasElement).queryByRole("alertdialog")).toBeNull(),
  );

const DESCRIPTION = `
Asks before an action that can't be taken back, such as a deletion: the question, what happens next, Cancel, then the action, red by default. Built on Base UI's alert dialog, drawn by the [Dialog and sheet](?path=/docs/molecules-dialog-and-sheet--docs) parts: a dialog from tablet up, a sheet on phone. Import it as a namespace: \`import * as ConfirmDialog from "…/confirm-dialog"\`.

| Part | What it is |
| --- | --- |
| \`ConfirmDialog.Basic\` | The whole confirmation from props: \`title\`, \`description\`, \`confirmLabel\`, \`onConfirm\`, and a \`trigger\` or \`open\`. |
| \`ConfirmDialog.Root\` | Holds the open state. A press on the dimmed page leaves it open. |
| \`ConfirmDialog.Trigger\` | Opens it; focus returns to it on close. |
| \`ConfirmDialog.Confirm\` | The action's button. A promise keeps it loading and the dialog open; once fulfilled, the dialog closes. Rejected, it stays open, and the action reports its failure. |
| \`Popup\`, \`Header\`, \`Title\`, \`Description\`, \`Footer\`, \`Cancel\`, \`Close\` | The Dialog's own parts. |

- A deletion either confirms here or happens at once and offers Undo in a [toast](?path=/docs/molecules-toast--docs).
- \`LeaveGuard\`, in \`src/lib/leave-guard.tsx\`, asks with this dialog before the app leaves a form that holds unsaved input, and the browser asks before the tab closes. Stay keeps the page and what was typed; Leave goes on.
- A special case, such as typing a name to confirm, composes the parts with its own field.
`;

const meta = {
  title: "Molecules/Confirm dialog",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: { component: DESCRIPTION },
      // Each story renders in its own frame, so its overlay covers that frame, not the Docs page.
      story: { inline: false, height: "30rem" },
    },
  },
  args: { intent: "danger", description: true },
  argTypes: {
    intent: {
      description:
        "`danger` (red text) for an action that destroys something; `primary` for one that doesn't.",
      options: ["danger", "primary"],
      control: { type: "inline-radio" },
    },
    description: {
      description: "Gives `description`, the sentence under the title.",
      control: { type: "boolean" },
    },
  },
  render: (args) => <DeleteChange {...args} />,
  play: async ({ canvasElement, step }) => {
    const trigger = within(canvasElement).getByRole("button", {
      name: text.open,
    });
    await step(
      "It opens on Cancel, which closes it and returns the focus",
      async () => {
        await userEvent.click(trigger);
        const dialog = await screen(canvasElement).findByRole("alertdialog");
        await expect(dialog).toHaveAccessibleName(text.title);
        const cancel = within(dialog).getByRole("button", { name: "Cancel" });
        await waitFor(() => expect(cancel).toHaveFocus());
        await userEvent.click(cancel);
        await gone(canvasElement);
        await expect(trigger).toHaveFocus();
      },
    );
    await step("The action loads, then the dialog closes", async () => {
      await userEvent.click(trigger);
      const dialog = await screen(canvasElement).findByRole("alertdialog");
      await userEvent.click(
        within(dialog).getByRole("button", { name: text.confirm }),
      );
      await expect(
        within(dialog).getByRole("button", { name: text.deleting }),
      ).toHaveAttribute("aria-busy", "true");
      await gone(canvasElement);
      await expect(within(canvasElement).getByText(text.deleted)).toBeVisible();
    });
    await step("Open again, to show it", async () => {
      await userEvent.click(trigger);
      await screen(canvasElement).findByRole("alertdialog");
    });
  },
} satisfies Meta<typeof DeleteChange>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Deleting a change. From tablet up, a dialog in the middle of the page. */
export const Desktop: Story = { globals: { viewport: { value: "desktop" } } };

/** The Docs page can't narrow a story, so the narrower widths live in the sidebar only. */
export const Tablet: Story = {
  tags: ["!autodocs"],
  globals: { viewport: { value: "tablet" } },
};

/** On phone, a sheet rising from the bottom, the action on top of Cancel. */
export const Phone: Story = {
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
};

/** The parts composed with a field: the action waits until the person's name is typed. */
export const TypeTheName: Story = {
  name: "Type the name to confirm",
  parameters: { controls: { disable: true } },
  render: () => <DeletePerson />,
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: text.openPerson }),
    );
    const dialog = await screen(canvasElement).findByRole("alertdialog");
    const confirm = within(dialog).getByRole("button", {
      name: text.openPerson,
    });
    await expect(confirm).toBeDisabled();
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: text.typeName }),
      "Max",
    );
    await expect(confirm).toBeEnabled();
  },
};

const leave = LEAVE_TEXTS.en;

/** Leaving a form with a note typed asks first, and Stay keeps the note. **Leaving a form, Leave**, in the sidebar, shows Leave and an untouched form. */
export const LeavingAFormStory: Story = {
  name: "Leaving a form",
  parameters: { controls: { disable: true } },
  render: () => <LeavingAForm />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const note = await canvas.findByRole("textbox", { name: leave.note });
    await step("Typed input asks before leaving", async () => {
      await userEvent.type(note, "Bought on Monday");
      await userEvent.click(canvas.getByRole("link", { name: leave.leave }));
      const dialog = await screen(canvasElement).findByRole("alertdialog");
      await expect(dialog).toHaveAccessibleName("Leave without saving?");
    });
    await step("Stay keeps the page and the note", async () => {
      await userEvent.click(
        screen(canvasElement).getByRole("button", { name: "Stay" }),
      );
      await gone(canvasElement);
      await expect(
        canvas.getByRole("textbox", { name: leave.note }),
      ).toHaveValue("Bought on Monday");
    });
    await step("Ask again, to show it", async () => {
      await userEvent.click(canvas.getByRole("link", { name: leave.leave }));
      await screen(canvasElement).findByRole("alertdialog");
    });
  },
};

/** The same on phone: the question rises as a sheet. */
export const LeavingAFormPhone: Story = {
  ...LeavingAFormStory,
  name: "Leaving a form, phone",
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
};

/** An untouched form leaves at once; with a note typed, Leave goes on to the other page. */
export const LeavingAFormLeave: Story = {
  ...LeavingAFormStory,
  name: "Leaving a form, Leave",
  tags: ["!autodocs"],
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const elsewhere = () =>
      canvas.findByRole("heading", { name: leave.elsewhere });
    await step("An untouched form leaves at once", async () => {
      await userEvent.click(
        await canvas.findByRole("link", { name: leave.leave }),
      );
      await expect(await elsewhere()).toBeVisible();
      await userEvent.click(canvas.getByRole("link", { name: leave.back }));
    });
    await step("Leave goes on, and drops the note", async () => {
      await userEvent.type(
        await canvas.findByRole("textbox", { name: leave.note }),
        "Bought on Monday",
      );
      await userEvent.click(canvas.getByRole("link", { name: leave.leave }));
      await userEvent.click(
        await screen(canvasElement).findByRole("button", { name: "Leave" }),
      );
      await expect(await elsewhere()).toBeVisible();
    });
  },
};
