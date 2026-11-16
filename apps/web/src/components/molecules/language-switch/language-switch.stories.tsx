import type { Language } from "@fpr/contracts";
import { languages } from "@fpr/contracts/values";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { LanguageSwitch } from "./language-switch";

/** The switch holding its pick, as a screen does once `useChangeLanguage` switches FPR. */
function Held({
  value,
  onValueChange,
  named,
}: {
  value: Language;
  onValueChange: (language: Language) => void;
  named?: boolean | undefined;
}) {
  const [language, setLanguage] = useState(value);

  return (
    <LanguageSwitch
      named={named}
      value={language}
      onValueChange={(picked) => {
        setLanguage(picked);
        onValueChange(picked);
      }}
    />
  );
}

const meta = {
  title: "Molecules/Language switch",
  component: LanguageSwitch,
  tags: ["autodocs"],
  args: { value: "fr", onValueChange: fn(), named: false },
  argTypes: {
    value: { control: { type: "inline-radio" }, options: languages },
    named: { control: "boolean" },
    onValueChange: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          "FR and EN as a segment on snow, at the right of a focused page’s header before sign-in and during onboarding; `named` writes “Français” and “English” in full, as in Settings. Each option is marked as written in its own language (`lang`). The screen switches FPR with `useChangeLanguage()` and passes the language it shows as `value`.",
      },
    },
  },
  render: (args) => <Held key={args.value} {...args} />,
} satisfies Meta<typeof LanguageSwitch>;

export default meta;

type Story = StoryObj<typeof meta>;

/** French, FPR’s language until a person picks one. Picking EN calls `onValueChange` with `en`. */
export const French: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "EN" }));
    await expect(args.onValueChange).toHaveBeenCalledWith("en");
    await expect(canvas.getByRole("button", { name: "EN" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  },
};

/** English, once picked. */
export const English: Story = { args: { value: "en" } };

/** Each language named in full, in its own language, as Settings shows them. */
export const Named: Story = { args: { named: true } };
