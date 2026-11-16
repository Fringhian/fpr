import type { Language } from "@fpr/contracts";
import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import { CameraIcon } from "@phosphor-icons/react/Camera";
import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import { CheckIcon } from "@phosphor-icons/react/Check";
import { CoinsIcon } from "@phosphor-icons/react/Coins";
import { MinusIcon } from "@phosphor-icons/react/Minus";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, within } from "storybook/test";
import { cn } from "../../../lib/cn";
import { useLanguage } from "../../../lib/i18n";
import { Button, type ButtonProps } from "./button";

/** The icons the playground offers, by name. */
const ICONS = {
  none: undefined,
  plus: PlusIcon,
  minus: MinusIcon,
  coins: CoinsIcon,
  camera: CameraIcon,
  check: CheckIcon,
} as const;

const NEXT_ICONS = {
  "arrow-right": ArrowRightIcon,
  "caret-right": CaretRightIcon,
  check: CheckIcon,
} as const;

/** The playground’s args: its icons are picked by name in the Controls panel. */
type PlaygroundArgs = Omit<ButtonProps, "icon" | "nextIcon"> & {
  icon: keyof typeof ICONS;
  nextIcon: keyof typeof NEXT_ICONS;
};

/** The demo labels, in the toolbar’s language. They are the stories’ content, not the button’s. */
const LABELS = {
  en: {
    record: "Record a change",
    sell: "Sell",
    signOut: "Sign out",
    addMember: "Add a member",
    chooseDate: "Choose the date",
    saveChange: "Save change",
    show: "Show",
    all: "All",
  },
  fr: {
    record: "Enregistrer un mouvement",
    sell: "Vendre",
    signOut: "Se déconnecter",
    addMember: "Ajouter un membre",
    chooseDate: "Choisir la date",
    saveChange: "Enregistrer",
    show: "Afficher",
    all: "Tout",
  },
} as const satisfies Record<Language, Record<string, string>>;

type Label = keyof (typeof LABELS)["en"];

function Text({ label }: { label: Label }) {
  return LABELS[useLanguage()][label];
}

/** The playground’s label follows its intent and size: a ghost is a short end-slot action, a step names what comes next. */
function playgroundLabel({ intent, size, next }: ButtonProps): Label {
  if (intent === "ghost") return "show";
  if (size !== "step") return "record";
  return next ? "chooseDate" : "saveChange";
}

const gutters = cn("", "p-m", "tablet:p-l", "desktop:p-l");

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-s">
      <h2 className="text-xs text-secondary">{title}</h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-s">{children}</div>;
}

/** The frame of an input, drawn to show a ghost button in its end slot. */
function EndSlot({ value, children }: { value: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[2.75rem] w-[16rem] items-center gap-s rounded-s bg-surface pr-xs pl-[0.875rem] text-m inset-shadow-outline">
      <span className="flex-1">{value}</span>
      {children}
    </div>
  );
}

/** Where a step flow puts its main button: the bottom, full width on phone, bottom right from tablet up. */
function StepFooter({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex gap-s",
        "flex-col",
        "tablet:flex-row tablet:justify-end",
        "desktop:flex-row desktop:justify-end",
      )}
    >
      {children}
    </div>
  );
}

/** Every variant and state. Hover and focus are drawn with the classes their states apply. */
function Overview() {
  return (
    <div className={cn("grid gap-l font-sans text-primary", gutters)}>
      <Section title="Intent">
        <Row>
          <Button intent="primary">
            <Text label="record" />
          </Button>
          <Button intent="secondary">
            <Text label="sell" />
          </Button>
          <Button intent="danger">
            <Text label="signOut" />
          </Button>
          <Button intent="ghost">
            <Text label="show" />
          </Button>
        </Row>
      </Section>
      <Section title="Intent: ghost, text alone, at the end of an input">
        <Row>
          <EndSlot value="••••••••••••">
            <Button intent="ghost" size="s">
              <Text label="show" />
            </Button>
          </EndSlot>
          <EndSlot value="30">
            <Button intent="ghost" size="s">
              <Text label="all" />
            </Button>
          </EndSlot>
        </Row>
      </Section>
      <Section title="Size: s 32px, m 40px">
        <Row>
          <Button size="s">
            <Text label="addMember" />
          </Button>
          <Button size="m">
            <Text label="addMember" />
          </Button>
        </Row>
      </Section>
      <Section title="Size: wide, 48px at full width">
        <Button size="wide" icon={PlusIcon}>
          <Text label="record" />
        </Button>
      </Section>
      <Section title="Size: step, 56px; full width on phone, fitted to its label from tablet up">
        <StepFooter>
          <Button intent="primary" size="step" next>
            <Text label="chooseDate" />
          </Button>
        </StepFooter>
        <StepFooter>
          <Button intent="primary" size="step">
            <Text label="saveChange" />
          </Button>
        </StepFooter>
      </Section>
      <Section title="States: hover, focus, disabled, loading">
        <Row>
          <Button intent="primary" className="bg-primary/90">
            Hover
          </Button>
          <Button intent="secondary" className="bg-highlight">
            Hover
          </Button>
          <Button intent="ghost" className="bg-highlight text-primary">
            Hover
          </Button>
          <Button intent="primary" className="focus-ring">
            Focus
          </Button>
          <Button intent="ghost" className="focus-ring">
            Focus
          </Button>
          <Button intent="primary" disabled>
            Disabled
          </Button>
          <Button intent="secondary" disabled>
            Disabled
          </Button>
          <Button intent="ghost" disabled>
            Disabled
          </Button>
          <Button intent="primary" loading>
            <Text label="saveChange" />
          </Button>
          <Button intent="secondary" loading>
            <Text label="saveChange" />
          </Button>
        </Row>
      </Section>
    </div>
  );
}

const DESCRIPTION = `
A capsule button, on Base UI’s button. One primary per screen region. A button names its action (“Save change”, “Review change”), never a bare “Continue”.

- **intent**: \`primary\` (charcoal), \`secondary\` (white, outlined), \`danger\` (red text), \`ghost\` (grey text alone, no fill and no outline): a quiet action inside another control, such as an input’s “Show” or “All”.
- **size**: \`s\` 32px, \`m\` 40px, \`wide\` 48px at full width, \`step\` 56px.
- **icon**: any Phosphor icon leading the label, \`icon={PlusIcon}\`.
- **step**: the main button of a step flow names what comes next (“Choose the date”). It fills the width at the bottom on phone and fits its label, bottom right, on tablet and desktop. \`next\` draws \`nextIcon\`, an arrow by default, at its right end when another step follows; the flow’s last button (“Save change”) has none.
- **States**: hover, the focus ring, disabled, and \`loading\`: a spinner and “Saving…”, at the same width. A loading button stays focusable and ignores presses.

Every other prop goes to Base UI’s button and the \`<button>\`, \`className\` included: a string, or a function of the button’s state. The **Phone** and **Tablet** stories in the sidebar show the step at the narrower widths.
`;

const meta = {
  title: "Atoms/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
  args: {
    intent: "primary",
    size: "m",
    next: false,
    loading: false,
    disabled: false,
  },
  argTypes: {
    intent: {
      control: { type: "inline-radio" },
      options: ["primary", "secondary", "danger", "ghost"],
    },
    size: {
      control: { type: "inline-radio" },
      options: ["s", "m", "wide", "step"],
    },
    icon: { options: Object.keys(ICONS), control: { type: "select" } },
    next: { control: { type: "boolean" }, if: { arg: "size", eq: "step" } },
    nextIcon: {
      options: Object.keys(NEXT_ICONS),
      control: { type: "select" },
      if: { arg: "next" },
    },
    loading: { control: { type: "boolean" } },
    loadingLabel: { control: { type: "text" }, if: { arg: "loading" } },
    disabled: {
      description: "Greys the button out and takes it out of the tab order.",
      control: { type: "boolean" },
    },
    children: {
      description:
        "The label, naming the action. An icon leads it through `icon`.",
      control: false,
    },
    render: {
      description:
        "Base UI’s `render`: renders the button as another element, such as a router link.",
      control: false,
    },
    nativeButton: {
      description:
        "Base UI’s `nativeButton`: set it to `false` when `render` gives an element other than a `<button>`.",
      control: false,
    },
    className: {
      description:
        "Classes added to the button’s, which win any conflict: a string, or a function of the button’s state.",
      control: false,
    },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

/** One button, configured in the Controls panel. */
export const Playground = {
  args: { icon: "none", nextIcon: "arrow-right" },
  render: ({ icon, nextIcon, ...args }) => (
    <div className="font-sans">
      <Button {...args} icon={ICONS[icon]} nextIcon={NEXT_ICONS[nextIcon]}>
        <Text label={playgroundLabel(args)} />
      </Button>
    </div>
  ),
} satisfies StoryObj<PlaygroundArgs>;

/** Every variant and state, here at the page’s width. */
export const AllVariants: Story = {
  parameters: { layout: "fullscreen", controls: { disable: true } },
  globals: { viewport: { value: "desktop" } },
  render: () => <Overview />,
};

/** The step fills the width on phone. */
export const Phone: Story = {
  ...AllVariants,
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
};

/** From tablet up, the step fits its label, bottom right. */
export const Tablet: Story = {
  ...AllVariants,
  tags: ["!autodocs"],
  globals: { viewport: { value: "tablet" } },
};

/** A button that can load keeps one width: “Sell” reserves the room “Saving…” needs, so nothing moves when it starts. */
export const Loading: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid justify-items-start gap-s font-sans">
      {(["primary", "secondary"] as const).map((intent) => (
        <Row key={intent}>
          <Button intent={intent} loading={false}>
            <Text label="sell" />
          </Button>
          <Button intent={intent} loading>
            <Text label="sell" />
          </Button>
          <Button intent={intent} loading={false}>
            <Text label="saveChange" />
          </Button>
          <Button intent={intent} loading>
            <Text label="saveChange" />
          </Button>
        </Row>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const buttons = within(canvasElement).getAllByRole("button");
    const idle = buttons.filter((button) => !button.hasAttribute("aria-busy"));
    const busy = buttons.filter((button) => button.hasAttribute("aria-busy"));
    await expect(busy).toHaveLength(idle.length);
    for (const [index, button] of busy.entries()) {
      await expect(button).toHaveAttribute("aria-disabled", "true");
      await expect(button.offsetWidth).toBe(idle[index]?.offsetWidth);
    }
  },
};
