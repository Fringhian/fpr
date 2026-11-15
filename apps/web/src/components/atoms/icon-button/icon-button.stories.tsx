import { CameraIcon } from "@phosphor-icons/react/Camera";
import { DotsThreeIcon } from "@phosphor-icons/react/DotsThree";
import { InfoIcon } from "@phosphor-icons/react/Info";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { XIcon } from "@phosphor-icons/react/X";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";
import { expect, within } from "storybook/test";
import { useLanguage } from "../../../lib/i18n";
import type { Language } from "../../../lib/language";
import { IconButton, type IconButtonProps } from "./icon-button";

/** The icons the playground offers, by name: the design system’s uses, then any other. */
const ICONS = {
  "dots-three": DotsThreeIcon,
  x: XIcon,
  info: InfoIcon,
  camera: CameraIcon,
  "magnifying-glass": MagnifyingGlassIcon,
  plus: PlusIcon,
} as const;

type IconName = keyof typeof ICONS;

/** The demo labels and sentence, in the toolbar’s language. They are the stories’ content, not the button’s. */
const TEXTS = {
  en: {
    more: "More actions",
    close: "Close",
    explain: "Explain the gain",
    photo: "Upload a photo",
    moreUse: "More actions, on cards and rows",
    closeUse: "Close, on dialogs and flows",
    photoUse: "With its ring, over a picture",
    gain: "Gain since you joined",
  },
  fr: {
    more: "Plus d’actions",
    close: "Fermer",
    explain: "Expliquer le gain",
    photo: "Ajouter une photo",
    moreUse: "Plus d’actions, sur les cartes et les lignes",
    closeUse: "Fermer, sur les fenêtres et les étapes",
    photoUse: "Avec son anneau, sur une photo",
    gain: "Gain depuis votre arrivée",
  },
} as const satisfies Record<Language, Record<string, string>>;

function Uses() {
  const text = TEXTS[useLanguage()];
  return (
    <ul className="grid gap-m font-sans text-primary">
      <li className="flex items-center gap-s">
        <IconButton icon={DotsThreeIcon} label={text.more} />
        <span className="text-xs text-secondary">{text.moreUse}</span>
      </li>
      <li className="flex items-center gap-s">
        <IconButton icon={XIcon} label={text.close} />
        <span className="text-xs text-secondary">{text.closeUse}</span>
      </li>
      <li className="flex items-center gap-xs">
        <span className="text-s font-medium">{text.gain}</span>
        <IconButton icon={InfoIcon} label={text.explain} size="s" />
      </li>
      <li className="flex items-center gap-s">
        <IconButton icon={CameraIcon} label={text.photo} ring />
        <span className="text-xs text-secondary">{text.photoUse}</span>
      </li>
    </ul>
  );
}

const DESCRIPTION = `
A round button holding one icon, on Base UI’s button. \`label\` is required: it names the action for screen readers, since the icon alone says nothing to them.

- **Plain**: the icon on a transparent disc. More actions (dots-three) on cards and rows, Close (x) on dialogs and flows.
- **ring**: a white disc with an outline, for a button over a picture or the sky, such as the camera on a picture.
- **size**: \`m\` 40px with a 20px icon; \`s\` 24px with a 16px icon, for the info icon next to an idea that needs a sentence.

\`icon\` takes any Phosphor icon. Every other prop goes to Base UI’s button and the \`<button>\`, \`className\` included: a string, or a function of the button’s state.
`;

/** The playground’s args: the icon is picked by its name in the Controls panel. */
type PlaygroundArgs = Omit<IconButtonProps, "icon"> & { icon: IconName };

const meta = {
  title: "Atoms/Icon button",
  component: IconButton,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
  args: { label: "Close", ring: false, size: "m", disabled: false },
  argTypes: {
    icon: {
      options: Object.keys(ICONS),
      control: { type: "select" },
    },
    label: { control: { type: "text" } },
    ring: { control: { type: "boolean" } },
    size: { control: { type: "inline-radio" }, options: ["s", "m"] },
    disabled: {
      description: "Greys the button out and takes it out of the tab order.",
      control: { type: "boolean" },
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
} satisfies Meta<typeof IconButton>;

export default meta;

/** One icon button, configured in the Controls panel. */
export const Playground = {
  args: { icon: "x" },
  render: ({ icon, ...args }) => <IconButton {...args} icon={ICONS[icon]} />,
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole("button");
    await expect(button).toHaveAccessibleName(args.label);
  },
} satisfies StoryObj<PlaygroundArgs>;

/** Each use the design system lists: more actions, close, info beside a sentence, and the camera with its ring. */
export const EachUse: StoryObj = {
  parameters: { controls: { disable: true } },
  render: () => <Uses />,
};

/** Plain and ring at both sizes, at rest, then disabled. */
export const Variants: StoryObj = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid grid-cols-[repeat(5,max-content)] items-center justify-items-center gap-s font-sans">
      {[false, true].map((disabled) => (
        <Fragment key={String(disabled)}>
          <span className="justify-self-start text-xs text-secondary">
            {disabled ? "Disabled" : "At rest"}
          </span>
          <IconButton
            icon={DotsThreeIcon}
            label="More actions"
            disabled={disabled}
          />
          <IconButton
            icon={CameraIcon}
            label="Upload a photo"
            ring
            disabled={disabled}
          />
          <IconButton
            icon={InfoIcon}
            label="Explain"
            size="s"
            disabled={disabled}
          />
          <IconButton
            icon={InfoIcon}
            label="Explain"
            size="s"
            ring
            disabled={disabled}
          />
        </Fragment>
      ))}
    </div>
  ),
};
