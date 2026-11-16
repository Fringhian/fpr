import { DesktopIcon } from "@phosphor-icons/react/Desktop";
import { QuestionIcon } from "@phosphor-icons/react/Question";
import { WarningCircleIcon } from "@phosphor-icons/react/WarningCircle";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useTranslation } from "react-i18next";
import { Button } from "../../atoms/button/button";
import { PageMessage, type PageMessageProps } from "./page-message";

/** The icons a page message offers, by their Phosphor name. */
const ICONS = {
  question: QuestionIcon,
  "warning-circle": WarningCircleIcon,
  desktop: DesktopIcon,
} as const;

/** The messages the app shows, by their key in the texts. */
type Use = "notFound" | "loadFailed" | "adminOnPhone";

/** The story's args: the icon picked by name, and whether the action shows. */
type StoryArgs = Omit<PageMessageProps, "icon" | "action"> & {
  icon: keyof typeof ICONS;
  action: boolean;
};

function Demo({
  use,
  icon,
  action,
}: Pick<StoryArgs, "icon" | "action"> & { use: Use }) {
  const { t } = useTranslation();

  const label =
    use === "notFound"
      ? t("pageStates.notFound.action")
      : t("pageStates.loadFailed.action");

  return (
    <main className="min-h-[40rem] bg-page px-m font-sans text-primary">
      <PageMessage
        icon={ICONS[icon]}
        title={t(`pageStates.${use}.title`)}
        description={t(`pageStates.${use}.description`)}
        action={action ? <Button intent="primary">{label}</Button> : undefined}
      />
    </main>
  );
}

const DESCRIPTION = `
A page that is only a message: the state icon, the page’s heading, one sentence that says what to do, and the way on, centred under the top of the page. It draws on the empty state’s parts, with the heading an \`<h1>\`.

- **Page not found**: an address no route answers, with Go to Home.
- **Can’t load this page**: a page whose data failed to load, with Retry.
- **Admin works on a larger screen**: the admin area on a phone, with no action.

It fills the content of whatever frame holds it: the app layout’s column, or a page of its own. It sits 60px under the top on phone and 96px from tablet up.
`;

const meta = {
  title: "Templates/Page message",
  component: PageMessage,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: DESCRIPTION } },
  },
  argTypes: {
    icon: {
      description: "The state’s `icon`: any Phosphor icon.",
      options: Object.keys(ICONS),
      control: { type: "select" },
    },
    action: {
      description:
        "Renders the way on under the sentence: a `Button`, such as Go to Home or Retry.",
      control: { type: "boolean" },
    },
    title: { control: false },
    description: { control: false },
    className: {
      description: "Classes added to the column’s, which win any conflict.",
      control: false,
    },
  },
} satisfies Meta<typeof PageMessage>;

export default meta;

type Story = StoryObj<StoryArgs>;

/** An address no route answers: Go to Home. */
export const NotFound: Story = {
  args: { icon: "question", action: true },
  render: (args) => <Demo use="notFound" {...args} />,
};

/** A page whose data failed to load: Retry. */
export const LoadFailed: Story = {
  args: { icon: "warning-circle", action: true },
  render: (args) => <Demo use="loadFailed" {...args} />,
};

/** The admin area on a phone: nothing to do there, so no action. */
export const AdminOnPhone: Story = {
  args: { icon: "desktop", action: false },
  globals: { viewport: { value: "phone" } },
  render: (args) => <Demo use="adminOnPhone" {...args} />,
};

/** Page not found on a phone, nearer the top. */
export const Phone: Story = {
  tags: ["!autodocs"],
  args: { icon: "question", action: true },
  globals: { viewport: { value: "phone" } },
  render: (args) => <Demo use="notFound" {...args} />,
};
