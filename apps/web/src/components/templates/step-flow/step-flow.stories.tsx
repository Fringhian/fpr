import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import {
  type FlowArgs,
  PortfolioStep,
  RecordStep,
  SavedStep,
  SignInStep,
} from "./step-flow-story-steps";

const DESCRIPTION = `
The focused page of sign-in, the access link, password reset, onboarding and Record a change: no navigation, one question per page. Import it as a namespace: \`import * as StepFlow from "…/step-flow"\`. \`StepFlow.Basic\` composes the common step from props; a step with a form, a language switch or more than one button composes the parts.

| Part | What it is |
| --- | --- |
| \`StepFlow.Root\` | The page, on snow, the viewport’s height: the column, then the sky panel. |
| \`StepFlow.Column\` | The step, the page’s \`<main>\`: full width on phone, one centred 560px column on tablet, 500px on the left on desktop. |
| \`StepFlow.Header\` | The top row, under the top safe area: \`StepFlow.Back\` on the left, \`StepFlow.Close\` or a language switch on the right. |
| \`StepFlow.Back\` | Back to the previous step: the caret, then “Back”. An \`<a>\`; \`render\` composes it with the router’s link or a button. |
| \`StepFlow.Close\` | Out of the flow, to where it opened, in grey: the cross alone on phone, “Close” from tablet up. |
| \`StepFlow.Progress\` | The \`StepProgress\` atom across the column: one segment per step. |
| \`StepFlow.Body\` | The step: the caption, the question, then what answers it. |
| \`StepFlow.Caption\` | What the flow knows so far, in grey: “Bought · World Index ETF”. |
| \`StepFlow.Question\` | The one question, the page’s \`<h1>\`: 27px on phone, 34px from tablet up. |
| \`StepFlow.Description\` | One sentence under the question. |
| \`StepFlow.Actions\` | The buttons, kept in view at the bottom while the step scrolls, the main button first. |
| \`StepFlow.MainButton\` | The \`Button\` atom at \`size="step"\`, in charcoal, named after what comes next; \`next\` ends it with an arrow. |
| \`StepFlow.Panel\` | The sky panel, desktop only: what the step changes, on the sky, with the ridge at its bottom. |

- **Phone**: the column fills the screen with 16px gutters, and the main button fills the width at the bottom. Several buttons stack, the main one on top. No sky.
- **Tablet**: one centred 560px column. The buttons follow the step, bottom right, fitted to their labels, the main one at the right end. No sky.
- **Desktop**: the 500px column on the left, the buttons bottom right of it; the sky panel fills the rest. The panel keeps the viewport’s height while the step scrolls, so its ridge never moves between steps.
- **A long step** scrolls the page; the buttons stay at the bottom of the screen over it.
- **A step that is a form** wraps \`StepFlow.Body\` and \`StepFlow.Actions\` in \`<form className="contents">\`, so Enter moves on.

The controls switch each optional part on and off and set the main button’s \`next\` and \`loading\`. The Docs page renders each story at its own width, narrower than the desktop’s 1120px, so the **Phone** and **Tablet** stories live in the sidebar, and the sky panel shows in the canvas at 1280px.
`;

const meta = {
  title: "Templates/Step flow",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: { component: DESCRIPTION },
      story: { inline: false, height: "40rem" },
    },
  },
  args: {
    back: true,
    close: true,
    progress: true,
    step: 4,
    count: 5,
    caption: true,
    panel: true,
    next: true,
    loading: false,
  },
  argTypes: {
    back: {
      name: "StepFlow.Back",
      description: "Renders Back, top left. Off on a flow’s first step.",
      control: { type: "boolean" },
    },
    close: {
      name: "StepFlow.Close",
      description:
        "Renders Close, top right, for a flow opened from another page.",
      control: { type: "boolean" },
    },
    progress: {
      name: "StepFlow.Progress",
      description: "Renders the progress. Off for a single step.",
      control: { type: "boolean" },
    },
    step: {
      name: "StepFlow.Progress step",
      control: { type: "range", min: 1, max: 6, step: 1 },
      if: { arg: "progress" },
    },
    count: {
      name: "StepFlow.Progress count",
      control: { type: "range", min: 2, max: 6, step: 1 },
      if: { arg: "progress" },
    },
    caption: {
      name: "StepFlow.Caption",
      description: "Renders what the flow knows so far, above the question.",
      control: { type: "boolean" },
    },
    panel: {
      name: "StepFlow.Panel",
      description: "Renders the sky panel, on desktop only.",
      control: { type: "boolean" },
    },
    next: {
      name: "StepFlow.MainButton next",
      description:
        "Ends the main button with an arrow: another step follows. Off on the flow’s last button.",
      control: { type: "boolean" },
    },
    loading: {
      name: "StepFlow.MainButton loading",
      description: "Shows the main button’s spinner while the step saves.",
      control: { type: "boolean" },
    },
  },
  render: (args) => <RecordStep {...args} />,
} satisfies Meta<FlowArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

const PHONE = { viewport: { value: "phone" } };
const TABLET = { viewport: { value: "tablet" } };
const DESKTOP = { viewport: { value: "desktop" } };

/** The story's main button, named after the next step in English. */
function mainButton(canvasElement: HTMLElement): HTMLElement {
  return within(canvasElement).getByRole("button", {
    name: /^(Review change|Meet everyone)$/,
  });
}

/** Record a change, step 4 of 5: Back and Close, the progress, the caption, the question, and the change so far on the sky. */
export const RecordAChange: Story = {
  name: "Record a change",
  globals: DESKTOP,
  play: async ({ canvasElement }) => {
    const panel = within(canvasElement).getByRole("complementary");
    await expect(panel).toBeVisible();
    // The ridge closes the panel at the bottom of the viewport.
    const ridge = panel.lastElementChild;
    await expect(ridge?.getBoundingClientRect().bottom).toBe(
      window.innerHeight,
    );
    // The main button sits bottom right of the column, fitted to its label.
    const column = within(canvasElement).getByRole("main");
    const button = mainButton(canvasElement);
    const columnBox = column.getBoundingClientRect();
    const buttonBox = button.getBoundingClientRect();
    await expect(columnBox.width).toBe(500);
    await expect(columnBox.right - buttonBox.right).toBe(44);
    await expect(buttonBox.width).toBeLessThan(columnBox.width - 88);
  },
};

/** On tablet: one centred 560px column, the main button bottom right, no sky. */
export const RecordAChangeTablet: Story = {
  name: "Record a change, tablet",
  tags: ["!autodocs"],
  globals: TABLET,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("complementary")).toBeNull();
    const column = canvas.getByRole("main").getBoundingClientRect();
    await expect(column.width).toBe(560);
    await expect(column.left).toBe((window.innerWidth - 560) / 2);
    const button = mainButton(canvasElement).getBoundingClientRect();
    await expect(button.right).toBe(column.right);
  },
};

/** On phone: the main button fills the width at the bottom, no sky. */
export const RecordAChangePhone: Story = {
  name: "Record a change, phone",
  tags: ["!autodocs"],
  globals: PHONE,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole("complementary")).toBeNull();
    const button = mainButton(canvasElement).getBoundingClientRect();
    await expect(button.width).toBe(window.innerWidth - 32);
    await expect(button.bottom).toBeGreaterThan(window.innerHeight - 100);
  },
};

/** Sign-in, composed from the parts: no Back and no progress, a language switch, a form, and the last button, without an arrow. */
export const SignIn: Story = {
  name: "Sign in",
  args: { back: false, progress: false, next: false },
  argTypes: { close: { table: { disable: true } } },
  globals: DESKTOP,
  render: (args) => <SignInStep {...args} />,
};

export const SignInTablet: Story = {
  ...SignIn,
  name: "Sign in, tablet",
  tags: ["!autodocs"],
  globals: TABLET,
};

export const SignInPhone: Story = {
  ...SignIn,
  name: "Sign in, phone",
  tags: ["!autodocs"],
  globals: PHONE,
};

/** Onboarding, step 3 of 4: a list longer than the screen. The page scrolls, and the main button stays at the bottom over it. */
export const LongStep: Story = {
  name: "Long step",
  args: { close: false, caption: false, step: 3, count: 4 },
  argTypes: { caption: { table: { disable: true } } },
  globals: DESKTOP,
  render: (args) => <PortfolioStep {...args} />,
};

export const LongStepTablet: Story = {
  ...LongStep,
  name: "Long step, tablet",
  tags: ["!autodocs"],
  globals: TABLET,
};

export const LongStepPhone: Story = {
  ...LongStep,
  name: "Long step, phone",
  tags: ["!autodocs"],
  globals: PHONE,
  play: async ({ canvasElement }) => {
    const { documentElement } = canvasElement.ownerDocument;
    await expect(documentElement.scrollHeight).toBeGreaterThan(
      window.innerHeight,
    );
    const button = mainButton(canvasElement).getBoundingClientRect();
    await expect(button.bottom).toBeLessThanOrEqual(window.innerHeight);
  },
};

/** Record a change, saved, composed from the parts: the main button and Done, which stack on phone. */
export const Saved: Story = {
  args: { back: false, progress: false, next: false },
  argTypes: {
    caption: { table: { disable: true } },
    progress: { table: { disable: true } },
  },
  globals: DESKTOP,
  render: (args) => <SavedStep {...args} />,
};

export const SavedPhone: Story = {
  ...Saved,
  name: "Saved, phone",
  tags: ["!autodocs"],
  globals: PHONE,
};
