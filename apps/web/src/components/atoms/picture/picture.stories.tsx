import type { Meta, StoryObj } from "@storybook/react-vite";
import { MEMBER_COLORS } from "../../../lib/member-color";
import {
  Picture,
  type PictureMedal,
  type PictureProps,
  type PictureSize,
} from "./picture";

/** An abstract photo, drawn inline: a sun over two hills, no person. */
const PHOTO = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'><defs><linearGradient id='g' x1='0' y1='0' x2='0.4' y2='1'><stop offset='0' stop-color='#f6b48f'/><stop offset='1' stop-color='#8c6a9e'/></linearGradient></defs><rect width='96' height='96' fill='url(#g)'/><circle cx='62' cy='34' r='14' fill='#ffe6b8'/><path d='M0 70 C24 52 44 54 64 66 C76 72 86 70 96 62 V96 H0Z' fill='#5d4a6e'/><path d='M0 82 C30 72 58 76 96 84 V96 H0Z' fill='#3d3150'/></svg>",
)}`;

/** A photo address that fails to load, so the initial stays. */
const BROKEN_PHOTO = "/missing-photo.webp";

const PHOTOS = { none: null, photo: PHOTO, broken: BROKEN_PHOTO } as const;
type PhotoName = keyof typeof PHOTOS;

const SIZES: readonly { size: PictureSize; px: number; use: string }[] = [
  { size: "xs", px: 20, use: "Chips and signs" },
  { size: "s", px: 28, use: "Lists" },
  { size: "m", px: 48, use: "Panels" },
  { size: "l", px: 88, use: "Member page, onboarding" },
];

const MEDALS: readonly PictureMedal[] = ["gold", "silver", "bronze"];

const MEMBERS = [
  "Sam",
  "Alex",
  "Lea",
  "Milo",
  "Ines",
  "Theo",
  "Nora",
  "Hugo",
  "Jade",
  "Owen",
] as const;

/** The stories' args: the photo is picked by name, and `none` drops the medal. */
type PictureArgs = Omit<PictureProps, "photo" | "medal"> & {
  photo: PhotoName;
  medal: PictureMedal | "none";
};

function toProps({ photo, medal, ...args }: PictureArgs): PictureProps {
  return {
    ...args,
    photo: PHOTOS[photo],
    medal: medal === "none" ? null : medal,
  };
}

/** A caption under a picture, naming what it shows. */
function Caption({ title, detail }: { title: string; detail: string }) {
  return (
    <span className="grid justify-items-center text-center">
      <span className="text-s font-semibold">{title}</span>
      <span className="text-xs text-secondary">{detail}</span>
    </span>
  );
}

const DESCRIPTION = `
A person’s picture: their initial on the pastel of their colour, or their photo, in a circle. It is an image named by the person’s name; where the name is written beside it, as in a chip or a lane, pass \`aria-hidden\`.

- Until a photo loads, and if it fails, the picture is the initial.
- An anonymous viewer receives a pseudonym and no photo, so they see the pseudonym’s initial, never a photo.
- The first three lanes of the standings ring their pictures in gold, silver and bronze on tablet and desktop. The phone shows no ring.
- The API sends a colour from 1 to 10: \`memberColor\` in \`src/lib/member-color.ts\` names it.

On this page every story renders at the page’s own width, a desktop width: the **Medals on tablet** and **Medals on phone** stories in the sidebar show the narrower ones.
`;

const meta = {
  title: "Atoms/Picture",
  component: Picture,
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: DESCRIPTION } },
  },
} satisfies Meta<typeof Picture>;

export default meta;

/** Every story's args, controls and render: one picture, configured in the Controls panel. */
const configurable = {
  args: {
    name: "Sam",
    color: "vermilion",
    size: "m",
    photo: "none",
    medal: "none",
  },
  argTypes: {
    name: { control: { type: "text" } },
    color: {
      control: { type: "select" },
      options: MEMBER_COLORS,
      table: { type: { summary: "MemberColor" } },
    },
    size: {
      control: { type: "inline-radio" },
      options: SIZES.map(({ size }) => size),
      table: { type: { summary: `"xs" | "s" | "m" | "l"` } },
    },
    photo: {
      description:
        "The photo’s URL, or `null` for the initial. Here, picked by name: no photo, an abstract photo, or one that fails to load.",
      control: { type: "inline-radio" },
      options: Object.keys(PHOTOS),
      table: { type: { summary: "string | null" } },
    },
    medal: {
      control: { type: "inline-radio" },
      options: ["none", ...MEDALS],
      table: { type: { summary: `"gold" | "silver" | "bronze" | null` } },
    },
  },
  render: (args) => <Picture {...toProps(args)} />,
} satisfies StoryObj<PictureArgs>;

type Story = StoryObj<PictureArgs>;

/** One picture, configured in the Controls panel. */
export const Playground: Story = { ...configurable };

/** The four sizes, each with its use. The other props stay configurable. */
export const Sizes: Story = {
  ...configurable,
  argTypes: { ...configurable.argTypes, size: { table: { disable: true } } },
  render: (args) => (
    <ul className="flex flex-wrap items-end gap-l">
      {SIZES.map(({ size, px, use }) => (
        <li key={size} className="grid justify-items-center gap-s">
          <Picture {...toProps({ ...args, size })} />
          <Caption title={`size="${size}" · ${px} px`} detail={use} />
        </li>
      ))}
    </ul>
  ),
};

/** The initial on the pastel, the photo, and a photo that fails to load, which keeps the initial. */
export const PhotoOrInitial: Story = {
  ...configurable,
  name: "Photo or initial",
  argTypes: { ...configurable.argTypes, photo: { table: { disable: true } } },
  render: (args) => (
    <ul className="flex flex-wrap items-end gap-l">
      <li className="grid justify-items-center gap-s">
        <Picture {...toProps({ ...args, photo: "none" })} />
        <Caption title="Initial" detail="No photo" />
      </li>
      <li className="grid justify-items-center gap-s">
        <Picture {...toProps({ ...args, photo: "photo" })} />
        <Caption title="Photo" detail="Uploaded" />
      </li>
      <li className="grid justify-items-center gap-s">
        <Picture {...toProps({ ...args, photo: "broken" })} />
        <Caption title="Initial" detail="The photo failed to load" />
      </li>
    </ul>
  ),
};

/** Every member colour's pastel, in order, under the members’ initials. */
export const Colours: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <ol className="flex flex-wrap gap-m">
      {MEMBER_COLORS.map((color, index) => (
        <li key={color} className="grid justify-items-center gap-s">
          <Picture name={MEMBERS[index] ?? color} color={color} size="m" />
          <Caption title={color} detail={`Colour ${index + 1}`} />
        </li>
      ))}
    </ol>
  ),
};

function MedalRow(args: PictureArgs) {
  return (
    <ul className="flex flex-wrap items-end gap-l">
      {MEDALS.map((medal, index) => (
        <li key={medal} className="grid justify-items-center gap-s">
          <Picture
            {...toProps({
              ...args,
              name: MEMBERS[index] ?? args.name,
              color: MEMBER_COLORS[index] ?? args.color,
              medal,
            })}
          />
          <Caption title={medal} detail={`Lane ${index + 1}`} />
        </li>
      ))}
    </ul>
  );
}

/** The first three lanes’ rings, on tablet and desktop. */
export const Medals: Story = {
  ...configurable,
  args: { ...configurable.args, size: "s" },
  argTypes: {
    ...configurable.argTypes,
    medal: { table: { disable: true } },
    name: { table: { disable: true } },
    color: { table: { disable: true } },
  },
  render: (args) => <MedalRow {...args} />,
};

export const MedalsOnTablet: Story = {
  ...Medals,
  name: "Medals on tablet",
  tags: ["!autodocs"],
  globals: { viewport: { value: "tablet" } },
};

/** The phone shows no ring. */
export const MedalsOnPhone: Story = {
  ...Medals,
  name: "Medals on phone",
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
};

/** The same person as a member sees them, and as an anonymous viewer does: the pseudonym’s initial, never the photo. */
export const AnonymousViewer: Story = {
  name: "Anonymous viewer",
  parameters: { controls: { disable: true } },
  render: () => (
    <ul className="flex flex-wrap items-end gap-l">
      <li className="grid justify-items-center gap-s">
        <Picture name="Sam" color="vermilion" size="m" photo={PHOTO} />
        <Caption title="Sam" detail="As a member sees them" />
      </li>
      <li className="grid justify-items-center gap-s">
        <Picture name="Calm Heron" color="vermilion" size="m" photo={null} />
        <Caption title="Calm Heron" detail="As an anonymous viewer sees them" />
      </li>
    </ul>
  ),
};
