import { HourglassMediumIcon } from "@phosphor-icons/react/HourglassMedium";
import { ProhibitIcon } from "@phosphor-icons/react/Prohibit";
import { QuestionIcon } from "@phosphor-icons/react/Question";
import { TrayIcon } from "@phosphor-icons/react/Tray";
import { WifiSlashIcon } from "@phosphor-icons/react/WifiSlash";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { StateIcon, type StateIconProps } from "./state-icon";

/** The state icons the design system lists, by their Phosphor name. */
const ICONS = {
  tray: TrayIcon,
  "wifi-slash": WifiSlashIcon,
  "hourglass-medium": HourglassMediumIcon,
  prohibit: ProhibitIcon,
  question: QuestionIcon,
} as const;

type IconName = keyof typeof ICONS;

/** The story's args: the icon is picked by its name in the Controls panel. */
type StateIconArgs = Omit<StateIconProps, "icon"> & { icon: IconName };

const meta = {
  title: "Atoms/State icon",
  component: StateIcon,
  tags: ["autodocs"],
  argTypes: {
    icon: {
      options: Object.keys(ICONS),
      control: { type: "select" },
    },
    size: { control: { type: "inline-radio" }, options: ["m", "l"] },
    label: { control: { type: "text" } },
  },
} satisfies Meta<typeof StateIcon>;

export default meta;

type Story = StoryObj<StateIconArgs>;

const render: Story["render"] = ({ icon, ...args }) => (
  <StateIcon {...args} icon={ICONS[icon]} />
);

/** Nothing here yet: the tray, over an empty state. */
export const Empty: Story = {
  args: { icon: "tray", size: "l", label: "" },
  render,
};

/** Offline: the wifi slash, over “You’re offline”. */
export const Offline: Story = {
  args: { icon: "wifi-slash", size: "l", label: "" },
  render,
};

/** The smaller circle, beside a line of text. */
export const Medium: Story = {
  args: { icon: "hourglass-medium", size: "m", label: "" },
  render,
};
