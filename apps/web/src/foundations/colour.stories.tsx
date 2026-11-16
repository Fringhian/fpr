import type { Meta, StoryObj } from "@storybook/react-vite";
import { cn } from "../lib/cn";
import { cssVariable } from "../lib/css-variable";
import {
  MEMBER_COLORS,
  MEMBER_FILLS,
  MEMBER_PASTELS,
} from "../lib/member-color";
import { Specimen, TokenValue } from "./specimen";

const PALETTE = [
  "charcoal",
  "slate",
  "cocoa",
  "peach",
  "lilac",
  "snow",
  "white",
  "sand",
  "blush",
  "fog",
  "pine",
  "brick",
  "mint",
  "rose",
  "indigo",
  "gold",
  "silver",
  "bronze",
] as const;

const ROLES = [
  {
    token: "primary",
    swatch: "bg-primary",
    use: "Main text, main buttons, anything selected, sign outlines, focus ring",
  },
  {
    token: "on-primary",
    swatch: "bg-on-primary",
    use: "Text and icons on primary",
  },
  {
    token: "secondary",
    swatch: "bg-secondary",
    use: "Secondary text, units, times, axis labels",
  },
  {
    token: "on-sky",
    swatch: "bg-on-sky",
    use: "Secondary text on the sky",
  },
  { token: "page", swatch: "bg-page", use: "Page ground, near ridge" },
  {
    token: "surface",
    swatch: "bg-surface",
    use: "Cards, signs, dialogs, sheets",
  },
  {
    token: "highlight",
    swatch: "bg-highlight",
    use: "Your own row, menu highlight, icon circles",
  },
  { token: "sky", swatch: "bg-sky", use: "Page bar and page header" },
  { token: "ridge", swatch: "bg-ridge", use: "Far ridge under the header" },
  {
    token: "divider",
    swatch: "bg-divider",
    use: "Outlines and dividers",
  },
  {
    token: "muted",
    swatch: "bg-muted",
    use: "Other members’ lines in the race; never text",
  },
  {
    token: "positive",
    swatch: "bg-positive",
    use: "Gains, always with a + sign",
  },
  {
    token: "negative",
    swatch: "bg-negative",
    use: "Losses, always with a − sign",
  },
  {
    token: "success",
    swatch: "bg-success",
    use: "Done and active: “Saved”, “Active”",
  },
  {
    token: "warning",
    swatch: "bg-warning",
    use: "Needs attention: “Price pending”, “Incomplete”, “Revoked”",
  },
  {
    token: "error",
    swatch: "bg-error",
    use: "Invalid input, and anything that failed",
  },
  { token: "link", swatch: "bg-link", use: "Text links" },
  {
    token: "gold",
    swatch: "bg-gold",
    use: "The first picture’s ring in the standings",
  },
  {
    token: "silver",
    swatch: "bg-silver",
    use: "The second picture’s ring in the standings",
  },
  {
    token: "bronze",
    swatch: "bg-bronze",
    use: "The third picture’s ring in the standings",
  },
] as const;

const SOFT_FILLS = [
  {
    token: "positive-soft",
    fill: "bg-positive-soft text-positive",
    sample: "+4.2%",
    use: "Gain chips",
  },
  {
    token: "negative-soft",
    fill: "bg-negative-soft text-negative",
    sample: "−1.8%",
    use: "Loss chips",
  },
  {
    token: "success-soft",
    fill: "bg-success-soft text-success",
    sample: "Active",
    use: "Badges that are done or active",
  },
  {
    token: "warning-soft",
    fill: "bg-warning-soft text-warning",
    sample: "Revoked",
    use: "Badges that need attention",
  },
] as const;

/** The palette colour a role points at, found by its value in the page. */
function paletteOf(role: string): string {
  const value = cssVariable(`--color-${role}`);
  return (
    PALETTE.find((name) => cssVariable(`--palette-${name}`) === value) ?? value
  );
}

function Palette() {
  return (
    <Specimen
      title="Palette"
      lead="Every hue of the look, named by what it is. The palette generates no classes: components use the roles, which point at it."
    >
      <ul
        className={cn(
          "grid gap-s",
          "grid-cols-2",
          "tablet:grid-cols-5",
          "desktop:grid-cols-5",
        )}
      >
        {PALETTE.map((name) => (
          <li
            key={name}
            className="overflow-hidden rounded-l bg-surface shadow-outline"
          >
            <div
              className="h-[4rem]"
              style={{ background: `var(--palette-${name})` }}
            />
            <div className="grid p-s">
              <span className="text-s font-semibold">{name}</span>
              <TokenValue variable={`--palette-${name}`} />
            </div>
          </li>
        ))}
      </ul>
    </Specimen>
  );
}

function Roles() {
  return (
    <Specimen
      title="Colour roles"
      lead="What components use: each role points at a palette colour. Primary means selected; the sky never marks state."
    >
      <ul
        className={cn(
          "grid gap-s",
          "grid-cols-1",
          "tablet:grid-cols-2",
          "desktop:grid-cols-3",
        )}
      >
        {ROLES.map(({ token, swatch, use }) => (
          <li
            key={token}
            className="flex items-center gap-s rounded-m bg-surface p-s shadow-outline"
          >
            <span
              className={cn(
                "size-xl flex-none rounded-s shadow-outline",
                swatch,
              )}
            />
            <span className="grid">
              <span className="text-s font-semibold">{token}</span>
              <span className="text-xs text-secondary">
                palette {paletteOf(token)}
              </span>
              <span className="text-xs text-secondary">{use}</span>
            </span>
          </li>
        ))}
      </ul>
    </Specimen>
  );
}

function SoftFills() {
  return (
    <Specimen
      title="Soft fills"
      lead="The pale ground of each state role, always under text of that role, which keeps a contrast of 4.5:1 or more on it."
    >
      <ul
        className={cn(
          "grid gap-s",
          "grid-cols-1",
          "tablet:grid-cols-2",
          "desktop:grid-cols-4",
        )}
      >
        {SOFT_FILLS.map(({ token, fill, sample, use }) => (
          <li
            key={token}
            className="grid gap-s rounded-m bg-surface p-s shadow-outline"
          >
            <span
              className={cn(
                "justify-self-start rounded-full px-s text-s font-semibold tabular-nums",
                fill,
              )}
            >
              {sample}
            </span>
            <span className="grid">
              <span className="text-s font-semibold">{token}</span>
              <span className="text-xs text-secondary">
                palette {paletteOf(token)}
              </span>
              <span className="text-xs text-secondary">{use}</span>
            </span>
          </li>
        ))}
      </ul>
    </Specimen>
  );
}

function Members() {
  return (
    <Specimen
      title="Member colours"
      lead="Ten colours, one per person, in this order. Full colour for their line and bar, the pastel for their picture. A colour always comes with a name, an initial, a photo or a sign."
    >
      <ol
        className={cn(
          "grid gap-s",
          "grid-cols-1",
          "tablet:grid-cols-2",
          "desktop:grid-cols-2",
        )}
      >
        {MEMBER_COLORS.map((name, index) => (
          <li
            key={name}
            className="flex items-center gap-s rounded-m bg-surface p-s shadow-outline"
          >
            <span
              className={cn(
                "inline-flex size-[2rem] flex-none items-center justify-center rounded-full font-semibold uppercase",
                MEMBER_PASTELS[name],
              )}
            >
              {name[0]}
            </span>
            <span className="grid w-[7rem] flex-none">
              <span className="text-s font-semibold">{name}</span>
              <span className="text-xs text-secondary">colour {index + 1}</span>
            </span>
            <span
              className={cn("h-s flex-1 rounded-full", MEMBER_FILLS[name])}
            />
            <span className="grid w-[10rem] flex-none text-xs text-secondary">
              <TokenValue variable={`--color-${name}`} />
              <span>
                pastel <TokenValue variable={`--color-${name}-pastel`} />
              </span>
            </span>
          </li>
        ))}
      </ol>
    </Specimen>
  );
}

const meta = {
  title: "Foundations/Colour",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const PaletteColours: Story = {
  name: "Palette",
  render: () => <Palette />,
};

export const ColourRoles: Story = {
  name: "Roles",
  render: () => <Roles />,
};

export const SoftFillColours: Story = {
  name: "Soft fills",
  render: () => <SoftFills />,
};

export const MemberColours: Story = {
  name: "Members",
  render: () => <Members />,
};
