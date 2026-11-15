import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import * as Field from "./field";

/** The stories' args: Field.Root's and the control's props, and a switch per optional part. */
interface FieldArgs {
  control: "Field.Control" | "Field.Password";
  description: boolean;
  error: boolean;
  invalid: boolean;
  disabled: boolean;
  decimal: boolean;
  placeholder: string;
  defaultValue: string;
}

/** A story's demo content: the words in the field, and how it checks its value. */
interface Content {
  label: string;
  help: string;
  /** The error's text. Without it, the error shows the message `validate` returns. */
  error?: string;
  validate?: (value: unknown) => string | null;
  autoComplete?: string;
}

type Story = StoryObj<FieldArgs>;

const DEFAULTS: FieldArgs = {
  control: "Field.Control",
  description: true,
  error: true,
  invalid: false,
  disabled: false,
  decimal: false,
  placeholder: "",
  defaultValue: "",
};

/** The field, built from the parts the controls switch on, around the story's content. */
function renderWith(content: Content): NonNullable<Story["render"]> {
  return ({
    control,
    description,
    error,
    invalid,
    disabled,
    decimal,
    placeholder,
    defaultValue,
  }) => {
    const input = {
      defaultValue,
      placeholder: placeholder || undefined,
      autoComplete: content.autoComplete,
    };
    return (
      <Field.Root
        key={defaultValue}
        invalid={invalid}
        disabled={disabled}
        {...(content.validate
          ? { validate: content.validate, validationMode: "onChange" }
          : {})}
        className="max-w-[21.25rem]"
      >
        <Field.Label>{content.label}</Field.Label>
        {control === "Field.Password" ? (
          <Field.Password {...input} />
        ) : (
          <Field.Control {...input} decimal={decimal} />
        )}
        {description ? (
          <Field.Description>{content.help}</Field.Description>
        ) : null}
        {error ? <Field.Error>{content.error}</Field.Error> : null}
      </Field.Root>
    );
  };
}

const DESCRIPTION = `
A label, an input, and help or an error under it, on Base UI's \`Field\`. Import it as a namespace: \`import * as Field from "…/field"\`.

| Part | What it is |
| --- | --- |
| \`Field.Root\` | The column. \`invalid\` marks it wrong from outside, such as an answer from the API; \`validate\` checks the value itself; \`disabled\` turns off its control. |
| \`Field.Label\` | The label, always visible above the control. Sentence case, no colon. |
| \`Field.Control\` | The Input atom, with all its props: \`icon\`, \`end\`, \`decimal\`, \`placeholder\`… |
| \`Field.Password\` | The Input atom as a password, with Show at its end, which reveals it and turns into Hide. |
| \`Field.Description\` | The help under the control. |
| \`Field.Error\` | The error. Without children, it shows the message \`validate\` returns. |

- The control is described by the help, through \`aria-describedby\`. While the field is invalid, the error replaces the help, in the same place and in \`aria-describedby\`, and a polite live region announces it.
- The error says what went wrong and what to do next.
- The password field never blocks paste. Give it \`autoComplete\`: \`current-password\` to sign in, \`new-password\` to choose one.

The controls switch each optional part on and off, and set the props of \`Field.Root\` and of the control.
`;

const meta = {
  title: "Molecules/Field",
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
  argTypes: {
    control: {
      options: ["Field.Control", "Field.Password"],
      control: { type: "inline-radio" },
      description:
        "The control under the label: the input, or the password with Show.",
      table: { category: "Parts" },
    },
    description: {
      name: "Field.Description",
      control: { type: "boolean" },
      description: "Renders the help under the control.",
      table: { category: "Parts" },
    },
    error: {
      name: "Field.Error",
      control: { type: "boolean" },
      description:
        "Renders the error, shown in place of the help while the field is invalid.",
      table: { category: "Parts" },
    },
    invalid: {
      control: { type: "boolean" },
      description:
        "Marks the field wrong from outside, such as an answer from the API.",
      table: { category: "Field.Root", type: { summary: "boolean" } },
    },
    disabled: {
      control: { type: "boolean" },
      description: "Turns off the control, and the Show button of a password.",
      table: { category: "Field.Root", type: { summary: "boolean" } },
    },
    decimal: {
      control: { type: "boolean" },
      description:
        "A decimal number: phones open their decimal keyboard, and the figures line up.",
      if: { arg: "control", eq: "Field.Control" },
      table: { category: "Field.Control", type: { summary: "boolean" } },
    },
    placeholder: {
      control: { type: "text" },
      description: "An example of what to type, ending in …",
      table: { category: "Field.Control", type: { summary: "string" } },
    },
    defaultValue: {
      control: { type: "text" },
      description: "The starting value.",
      table: { category: "Field.Control", type: { summary: "string" } },
    },
  },
} satisfies Meta<FieldArgs>;

export default meta;

/** The help under the input, which describes it. */
export const Help: Story = {
  args: { ...DEFAULTS, defaultValue: "Alex" },
  render: renderWith({
    label: "Display name",
    help: "Shown on the race, your page, and the charts.",
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "Display name" });
    const help = canvas.getByText(
      "Shown on the race, your page, and the charts.",
    );
    await expect(input).toHaveAttribute("aria-describedby", help.id);
  },
};

/** Invalid: the error replaces the help, and the outline turns red. */
export const Invalid: Story = {
  name: "Error",
  args: { ...DEFAULTS, defaultValue: "30", decimal: true, invalid: true },
  render: renderWith({
    label: "How many did you sell?",
    help: "The units you sold, with their decimals.",
    error: "You held 25 on 3 March. Enter 25 or less.",
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", {
      name: "How many did you sell?",
    });
    const error = canvas.getByText("You held 25 on 3 March. Enter 25 or less.");
    await expect(
      canvas.queryByText("The units you sold, with their decimals."),
    ).toBeNull();
    await expect(input).toHaveAttribute("aria-describedby", error.id);
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(error.closest("[aria-live]")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  },
};

const MAX_SOLD = 25;

/**
 * A quantity, checked as you type: over 25, the error replaces the help;
 * back under it, the help returns. Phones open the decimal keyboard, and a
 * French decimal comma is kept.
 */
export const DecimalAmount: Story = {
  name: "Decimal amount",
  args: { ...DEFAULTS, decimal: true },
  render: renderWith({
    label: "How many did you sell?",
    help: "You held 25 on 3 March.",
    validate: (value) =>
      Number(String(value).replace(",", ".")) > MAX_SOLD
        ? "You held 25 on 3 March. Enter 25 or less."
        : null,
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", {
      name: "How many did you sell?",
    });
    const help = canvas.getByText("You held 25 on 3 March.");
    await expect(input).toHaveAttribute("inputmode", "decimal");
    await expect(input).toHaveAttribute("aria-describedby", help.id);

    await userEvent.type(input, "30");
    const error = await canvas.findByText(
      "You held 25 on 3 March. Enter 25 or less.",
    );
    await expect(canvas.queryByText("You held 25 on 3 March.")).toBeNull();
    await expect(input).toHaveAttribute("aria-describedby", error.id);
    await expect(input).toHaveAttribute("aria-invalid", "true");

    await userEvent.clear(input);
    await userEvent.type(input, "12,5");
    const back = await canvas.findByText("You held 25 on 3 March.");
    await waitFor(() =>
      expect(input).toHaveAttribute("aria-describedby", back.id),
    );
  },
};

/** The password, hidden until Show reveals it; Hide hides it again. */
export const PasswordWithShow: Story = {
  name: "Password with Show",
  args: {
    ...DEFAULTS,
    control: "Field.Password",
    defaultValue: "correct-horse-battery",
  },
  render: renderWith({
    label: "Password",
    help: "At least 12 characters.",
    autoComplete: "new-password",
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText("Password");
    await expect(input).toHaveAttribute("type", "password");
    await expect(input).toHaveAttribute("autocomplete", "new-password");

    await userEvent.click(
      canvas.getByRole("button", { name: "Show password" }),
    );
    await expect(input).toHaveAttribute("type", "text");

    await userEvent.click(
      canvas.getByRole("button", { name: "Hide password" }),
    );
    await expect(input).toHaveAttribute("type", "password");
  },
};

/** Disabled: the input greys out, and so does Show on a password. */
export const Disabled: Story = {
  args: { ...DEFAULTS, defaultValue: "Alex", disabled: true },
  render: renderWith({
    label: "Display name",
    help: "Shown on the race, your page, and the charts.",
  }),
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox", {
      name: "Display name",
    });
    await expect(input).toBeDisabled();
  },
};
