import type { Meta, StoryObj } from "@storybook/react-vite";
import { Specimen, TokenValue } from "./specimen";

const CORNERS = [
  { token: "s", className: "rounded-s", use: "Inputs" },
  { token: "m", className: "rounded-m", use: "Rows, your lane" },
  { token: "l", className: "rounded-l", use: "Cards" },
  { token: "xl", className: "rounded-xl", use: "Dialogs, sheets" },
] as const;

const SHADOWS = [
  { token: "outline", className: "shadow-outline", use: "Every resting card" },
  {
    token: "rest",
    className: "shadow-rest",
    use: "The one hero card per screen, resting on the horizon",
  },
  {
    token: "float",
    className: "shadow-float",
    use: "Tab bar, menus, popovers, sheets, dialogs",
  },
] as const;

function Corners() {
  return (
    <Specimen
      title="Corners"
      lead="Round and soft. Capsules for everything that selects or labels, and circles for pictures."
    >
      <ul className="flex flex-wrap gap-l">
        {CORNERS.map(({ token, className, use }) => (
          <li key={token} className="grid gap-xs">
            <div
              className={`h-[4rem] w-[6rem] bg-tint shadow-outline ${className}`}
            />
            <span className="text-s font-semibold">rounded-{token}</span>
            <TokenValue variable={`--radius-${token}`} />
            <span className="text-xs text-ink-soft">{use}</span>
          </li>
        ))}
        <li className="grid gap-xs">
          <div className="h-[4rem] w-[6rem] rounded-full bg-tint shadow-outline" />
          <span className="text-s font-semibold">rounded-full</span>
          <span className="text-xs text-ink-soft">Fully round</span>
          <span className="text-xs text-ink-soft">Capsules, pictures</span>
        </li>
      </ul>
    </Specimen>
  );
}

function Elevation() {
  return (
    <Specimen
      title="Elevation"
      lead="Mostly flat. A shadow means “this sits above the page”: the hero, what floats, overlays. Nothing else gets one."
    >
      <ul className="flex flex-wrap gap-l">
        {SHADOWS.map(({ token, className, use }) => (
          <li key={token} className="grid w-[12rem] gap-s">
            <div
              className={`flex h-[6rem] items-end rounded-l bg-paper p-s text-s font-semibold ${className}`}
            >
              shadow-{token}
            </div>
            <span className="text-xs text-ink-soft">{use}</span>
          </li>
        ))}
      </ul>
    </Specimen>
  );
}

const meta = {
  title: "Foundations/Shape",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const CornerRadius: Story = { render: () => <Corners /> };

export const Shadows: Story = { render: () => <Elevation /> };
