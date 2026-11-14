import { ArrowsClockwiseIcon } from "@phosphor-icons/react/ArrowsClockwise";
import { CameraIcon } from "@phosphor-icons/react/Camera";
import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import { ChartLineIcon } from "@phosphor-icons/react/ChartLine";
import { CheckIcon } from "@phosphor-icons/react/Check";
import { CoinsIcon } from "@phosphor-icons/react/Coins";
import { DotsThreeIcon } from "@phosphor-icons/react/DotsThree";
import { HourglassMediumIcon } from "@phosphor-icons/react/HourglassMedium";
import { HouseIcon } from "@phosphor-icons/react/House";
import { InfoIcon } from "@phosphor-icons/react/Info";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { MinusIcon } from "@phosphor-icons/react/Minus";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { ProhibitIcon } from "@phosphor-icons/react/Prohibit";
import { QuestionIcon } from "@phosphor-icons/react/Question";
import { TrayIcon } from "@phosphor-icons/react/Tray";
import { UserGearIcon } from "@phosphor-icons/react/UserGear";
import { UsersThreeIcon } from "@phosphor-icons/react/UsersThree";
import { WalletIcon } from "@phosphor-icons/react/Wallet";
import { WifiSlashIcon } from "@phosphor-icons/react/WifiSlash";
import { XIcon } from "@phosphor-icons/react/X";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Specimen } from "../../foundations/specimen";
import { Icon, type IconSize } from "./icon";

const NAVIGATION = [
  { name: "house", icon: HouseIcon, use: "Home" },
  { name: "users-three", icon: UsersThreeIcon, use: "Members" },
  { name: "wallet", icon: WalletIcon, use: "Portfolio" },
  { name: "chart-line", icon: ChartLineIcon, use: "Shares" },
  { name: "user-gear", icon: UserGearIcon, use: "People" },
  {
    name: "arrows-clockwise",
    icon: ArrowsClockwiseIcon,
    use: "Tracked shares",
  },
] as const;

const ICONS = [
  ...NAVIGATION,
  { name: "caret-right", icon: CaretRightIcon, use: "Goes to a page" },
  { name: "caret-down", icon: CaretDownIcon, use: "Opens in place" },
  { name: "info", icon: InfoIcon, use: "Explain" },
  { name: "dots-three", icon: DotsThreeIcon, use: "More actions" },
  { name: "x", icon: XIcon, use: "Close" },
  { name: "magnifying-glass", icon: MagnifyingGlassIcon, use: "Search" },
  { name: "plus", icon: PlusIcon, use: "Bought, record" },
  { name: "minus", icon: MinusIcon, use: "Sold" },
  { name: "coins", icon: CoinsIcon, use: "Cash" },
  { name: "camera", icon: CameraIcon, use: "Photo" },
  { name: "check", icon: CheckIcon, use: "Selected colour" },
  { name: "hourglass-medium", icon: HourglassMediumIcon, use: "Waiting" },
  { name: "tray", icon: TrayIcon, use: "Empty" },
  { name: "wifi-slash", icon: WifiSlashIcon, use: "Offline" },
  { name: "prohibit", icon: ProhibitIcon, use: "Access ended" },
  { name: "question", icon: QuestionIcon, use: "Not found" },
] as const;

const SIZES: readonly { size: IconSize; px: number; use: string }[] = [
  { size: "s", px: 16, use: "In text" },
  { size: "m", px: 20, use: "In navigation" },
  { size: "l", px: 24, use: "Page actions and state icons" },
];

function Catalogue() {
  return (
    <Specimen
      title="Icons"
      lead="Phosphor, regular weight; the fill weight for the current navigation item. No character or emoji stands in for an icon."
    >
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-s">
        {ICONS.map(({ name, icon, use }) => (
          <li
            key={name}
            className="flex flex-col items-center gap-xs rounded-m bg-surface px-xs py-m text-center shadow-outline"
          >
            <Icon icon={icon} size="l" />
            <span className="text-xs text-secondary">{use}</span>
            <code className="text-xs text-secondary">{name}</code>
          </li>
        ))}
      </ul>
    </Specimen>
  );
}

function Scale() {
  return (
    <Specimen
      title="Sizes and weights"
      lead="16 px in text, 20 px in navigation, 24 px for page actions and state icons. The fill weight marks the current navigation item."
    >
      <ul className="mb-l flex flex-wrap gap-l">
        {SIZES.map(({ size, px, use }) => (
          <li key={size} className="grid justify-items-start gap-xs">
            <Icon icon={HouseIcon} size={size} />
            <span className="text-s font-semibold">
              size=&quot;{size}&quot;
            </span>
            <span className="text-xs text-secondary">
              {px} px · {use}
            </span>
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap gap-l">
        {NAVIGATION.map(({ name, icon, use }) => (
          <li key={name} className="grid justify-items-start gap-xs">
            <span className="flex gap-s">
              <Icon icon={icon} size="m" />
              <Icon icon={icon} size="m" weight="fill" />
            </span>
            <span className="text-s font-semibold">{use}</span>
            <span className="text-xs text-secondary">regular · fill</span>
          </li>
        ))}
      </ul>
    </Specimen>
  );
}

const meta = {
  title: "Foundations/Icons",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const AllIcons: Story = { render: () => <Catalogue /> };

export const SizesAndWeights: Story = { render: () => <Scale /> };
