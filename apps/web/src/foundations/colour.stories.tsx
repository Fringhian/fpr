import type { Meta, StoryObj } from "@storybook/react-vite";
import { Specimen, TokenValue } from "./specimen";

const SEMANTIC = [
  {
    name: "Charcoal ink",
    token: "ink",
    swatch: "bg-ink",
    role: "Text, selected controls, main buttons, sign outlines, focus ring",
  },
  {
    name: "Soft ink",
    token: "ink-soft",
    swatch: "bg-ink-soft",
    role: "Secondary text, units, times, axis labels",
  },
  {
    name: "Sky ink",
    token: "ink-sky",
    swatch: "bg-ink-sky",
    role: "Secondary text on the sky",
  },
  {
    name: "Morning peach",
    token: "sky",
    swatch: "bg-sky",
    role: "Page bar and page header",
  },
  {
    name: "Lilac ridge",
    token: "ridge",
    swatch: "bg-ridge",
    role: "Far ridge under the header",
  },
  {
    name: "Warm snow",
    token: "snow",
    swatch: "bg-snow",
    role: "Page ground, near ridge",
  },
  {
    name: "Paper white",
    token: "paper",
    swatch: "bg-paper",
    role: "Cards, signs, dialogs, sheets",
  },
  {
    name: "Snowline",
    token: "snowline",
    swatch: "bg-snowline",
    role: "Outlines and dividers",
  },
  {
    name: "Your tint",
    token: "tint",
    swatch: "bg-tint",
    role: "Your own row, menu highlight, icon circles",
  },
  {
    name: "Context grey",
    token: "context",
    swatch: "bg-context",
    role: "Other members in the race",
  },
  {
    name: "Gain",
    token: "gain",
    swatch: "bg-gain",
    role: "Gains, with a + sign",
  },
  {
    name: "Loss",
    token: "loss",
    swatch: "bg-loss",
    role: "Losses and errors, with a − sign",
  },
  { name: "Link", token: "link", swatch: "bg-link", role: "Text links" },
] as const;

const MEMBERS = [
  { name: "Vermilion", line: "bg-member-1", picture: "bg-member-1-pastel" },
  { name: "Cobalt", line: "bg-member-2", picture: "bg-member-2-pastel" },
  { name: "Green", line: "bg-member-3", picture: "bg-member-3-pastel" },
  { name: "Violet", line: "bg-member-4", picture: "bg-member-4-pastel" },
  { name: "Amber", line: "bg-member-5", picture: "bg-member-5-pastel" },
  { name: "Pink", line: "bg-member-6", picture: "bg-member-6-pastel" },
  { name: "Cyan", line: "bg-member-7", picture: "bg-member-7-pastel" },
  { name: "Lime", line: "bg-member-8", picture: "bg-member-8-pastel" },
  { name: "Sienna", line: "bg-member-9", picture: "bg-member-9-pastel" },
  {
    name: "Periwinkle",
    line: "bg-member-10",
    picture: "bg-member-10-pastel",
  },
] as const;

function SemanticColours() {
  return (
    <Specimen
      title="Colour"
      lead="Warm, light grounds under a peach sky, charcoal ink, and two state colours. Charcoal means selected; a member colour never marks selection, and the sky never marks state."
    >
      <ul className="grid grid-cols-1 gap-s tablet:grid-cols-2 desktop:grid-cols-4">
        {SEMANTIC.map(({ name, token, swatch, role }) => (
          <li
            key={token}
            className="overflow-hidden rounded-l bg-paper shadow-outline"
          >
            <div className={`h-[4rem] ${swatch}`} />
            <div className="grid gap-xs p-s">
              <span className="text-s font-semibold">{name}</span>
              <span className="text-xs text-ink-soft">
                {token} · <TokenValue variable={`--color-${token}`} />
              </span>
              <span className="text-xs text-ink-soft">{role}</span>
            </div>
          </li>
        ))}
      </ul>
    </Specimen>
  );
}

function MemberColours() {
  return (
    <Specimen
      title="Member colours"
      lead="Ten colours, one per person, in this order. Full colour for their line and bar, the pastel for their picture. A colour always comes with a name, an initial, a photo or a sign."
    >
      <ol className="grid grid-cols-1 gap-s tablet:grid-cols-2">
        {MEMBERS.map(({ name, line, picture }, index) => {
          const n = index + 1;
          return (
            <li
              key={name}
              className="flex items-center gap-s rounded-m bg-paper px-s py-s shadow-outline"
            >
              <span
                className={`inline-flex size-[2rem] flex-none items-center justify-center rounded-full font-semibold ${picture}`}
              >
                {name[0]}
              </span>
              <span className="w-[6rem] flex-none text-s font-semibold">
                {name}
              </span>
              <span className={`h-s flex-1 rounded-full ${line}`} />
              <span className="grid w-[11rem] flex-none text-xs text-ink-soft">
                <span>
                  member-{n} · <TokenValue variable={`--color-member-${n}`} />
                </span>
                <span>
                  member-{n}-pastel ·{" "}
                  <TokenValue variable={`--color-member-${n}-pastel`} />
                </span>
              </span>
            </li>
          );
        })}
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

export const Semantic: Story = { render: () => <SemanticColours /> };

export const Members: Story = { render: () => <MemberColours /> };
