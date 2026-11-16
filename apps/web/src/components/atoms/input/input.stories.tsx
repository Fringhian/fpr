import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { XIcon } from "@phosphor-icons/react/X";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, userEvent, within } from "storybook/test";
import { Button } from "../button/button";
import { IconButton } from "../icon-button/icon-button";
import { Input, type InputProps } from "./input";

/** A ghost button in the end slot, nudged towards the edge with room for its focus ring. */
function EndButton({ children }: { children: ReactNode }) {
  return (
    <Button intent="ghost" size="s" className="-me-xs">
      {children}
    </Button>
  );
}

const ICONS = { none: undefined, "magnifying-glass": MagnifyingGlassIcon };

const ENDS = {
  none: null,
  show: <EndButton>Show</EndButton>,
  all: <EndButton>All</EndButton>,
  clear: (
    <IconButton
      icon={XIcon}
      label="Clear the search"
      size="s"
      className="-me-xs"
    />
  ),
};

/** The stories' args: the icon and the end slot are picked by name in the Controls panel. */
type InputArgs = Omit<InputProps, "icon" | "end"> & {
  icon: keyof typeof ICONS;
  end: keyof typeof ENDS;
};

type Story = StoryObj<InputArgs>;

const DEFAULTS: InputArgs = {
  icon: "none",
  end: "none",
  decimal: false,
  invalid: false,
  disabled: false,
  type: "text",
};

/**
 * The input under its label, which stands above it as it always does in the
 * app. The label is the story's demo content, set in its `parameters`.
 */
const render: Story["render"] = (
  { icon, end, ...args },
  { id, parameters },
) => (
  <div className="grid max-w-[21.25rem] gap-xs">
    <label htmlFor={id} className="text-s font-medium text-primary">
      {String(parameters.label)}
    </label>
    <Input
      key={String(args.defaultValue)}
      {...args}
      id={id}
      icon={ICONS[icon]}
      end={ENDS[end]}
    />
  </div>
);

const DESCRIPTION = `
Text entry: 44px tall, 16px text, 12px corners, with a sand outline that turns charcoal on focus and red when the value is wrong. A label stands above it, always: the Field molecule adds it, with help or an error under it.

- \`icon\` puts an icon at the start, such as the search's magnifying glass.
- \`end\` takes a short control at the end: Show on a password, All on a quantity, clear on a search.
- \`decimal\` opens the decimal keyboard on phones and lines the figures up. The input stays a text input, so a French decimal comma is kept.
- \`invalid\` draws the red outline and sets \`aria-invalid\`. Inside a Base UI \`Field\`, its validation sets it too.
- Every other prop goes to the \`<input>\`: \`placeholder\` (an example ending in …), \`disabled\`, \`type\`, \`autoComplete\`. Paste is never blocked.
- \`className\` styles the outlined box, such as its width; the input fills it.
`;

const meta = {
  title: "Atoms/Input",
  component: Input,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
  argTypes: {
    icon: {
      options: Object.keys(ICONS),
      control: { type: "select" },
      description: "An icon at the start, picked by name here.",
      table: { type: { summary: "Icon" } },
    },
    end: {
      options: Object.keys(ENDS),
      control: { type: "select" },
      description:
        "A short control at the end, picked by name here: Show, All, or clear.",
    },
    decimal: {
      control: { type: "boolean" },
      table: { type: { summary: "boolean" } },
    },
    invalid: {
      control: { type: "boolean" },
      table: { type: { summary: "boolean" } },
    },
    className: { control: false, table: { type: { summary: "string" } } },
    disabled: {
      control: { type: "boolean" },
      description: "The input can't be used.",
    },
    type: {
      control: { type: "inline-radio" },
      options: ["text", "password", "email"],
      description: "The input's type.",
    },
    placeholder: {
      control: { type: "text" },
      description: "An example of what to type, ending in …",
    },
    defaultValue: {
      control: { type: "text" },
      description: "The starting value.",
    },
  },
} satisfies Meta<typeof Input>;

export default meta;

/** Empty, with an example placeholder ending in …: the search, with its icon. */
export const Empty: Story = {
  args: {
    ...DEFAULTS,
    icon: "magnifying-glass",
    placeholder: "Search by name, ISIN or ticker…",
  },
  parameters: { label: "Search the shares" },
  render,
};

export const Filled: Story = {
  args: { ...DEFAULTS, defaultValue: "Alex" },
  parameters: { label: "Display name" },
  render,
};

/** Focused: the outline turns charcoal. On this page, click into the input to see it; the story on its own focuses it. */
export const Focused: Story = {
  args: { ...DEFAULTS, defaultValue: "Alex" },
  parameters: { label: "Display name" },
  render,
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox");
    await userEvent.click(input);
    await expect(input).toHaveFocus();
  },
};

/** Wrong: a red outline. The Field molecule writes the error under it. */
export const Invalid: Story = {
  args: {
    ...DEFAULTS,
    defaultValue: "30",
    end: "all",
    decimal: true,
    invalid: true,
  },
  parameters: { label: "How many did you sell?" },
  render,
};

/** A quantity or a price: phones open the decimal keyboard. */
export const Decimal: Story = {
  args: { ...DEFAULTS, defaultValue: "40.80", decimal: true },
  parameters: { label: "Value of one unit" },
  render,
};

export const PasswordWithShow: Story = {
  name: "Password with Show",
  args: {
    ...DEFAULTS,
    type: "password",
    defaultValue: "correct-horse-battery",
    end: "show",
  },
  parameters: { label: "Password" },
  render,
};

export const SearchWithClear: Story = {
  name: "Search with clear",
  args: {
    ...DEFAULTS,
    icon: "magnifying-glass",
    defaultValue: "world",
    end: "clear",
  },
  parameters: { label: "Search the shares" },
  render,
};

export const Disabled: Story = {
  args: { ...DEFAULTS, defaultValue: "Alex", disabled: true },
  parameters: { label: "Display name" },
  render,
};
