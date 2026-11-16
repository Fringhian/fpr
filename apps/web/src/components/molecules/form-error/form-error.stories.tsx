import type { Meta, StoryObj } from "@storybook/react-vite";
import { useTranslation } from "react-i18next";
import { FormError, type FormErrorProps } from "./form-error";

/** The story's args: whether the form has an error, written in the toolbar's language. */
type FormErrorArgs = Omit<FormErrorProps, "children"> & { error: boolean };

function Demo({ error, ...props }: FormErrorArgs) {
  const { t } = useTranslation();

  return (
    <FormError {...props} className="max-w-[35rem]">
      {error ? t("errors.rateLimited") : null}
    </FormError>
  );
}

const meta = {
  title: "Molecules/Form error",
  component: Demo,
  tags: ["autodocs"],
  args: { error: true },
  argTypes: {
    error: {
      description:
        "Passes the error as `children`; without one, nothing renders.",
      control: { type: "boolean" },
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "An answer that refuses the whole form rather than one field, such as too many attempts or no connection, under the form’s last field, in the error colour after a warning icon. A field’s own error stays under that field (`Field.Error`). It is an alert, announced as it appears, and renders nothing without an error, so it takes no room in the form until then.",
      },
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Too many attempts: what went wrong, then what to do next. */
export const Default: Story = {};
