import type { Meta, StoryObj } from "@storybook/react-vite";
import { Specimen, TokenValue } from "./specimen";

const SAMPLE = "This month, you’re up €512 (+4.2%)";

const SCALE = [
  {
    role: "Display",
    token: "display",
    className: "text-display font-semibold",
    weight: "600",
    use: "The page sentence on tablet and desktop",
  },
  {
    role: "Headline",
    token: "xl",
    className: "text-xl font-semibold",
    weight: "600",
    use: "The page sentence and a member’s name on phone",
  },
  {
    role: "Title",
    token: "l",
    className: "text-l font-semibold",
    weight: "600",
    use: "Page bar titles, card and section titles",
  },
  {
    role: "Body",
    token: "m",
    className: "text-m font-normal",
    weight: "400",
    use: "Sentences, inputs, list rows",
  },
  {
    role: "Small",
    token: "s",
    className: "text-s font-medium",
    weight: "400–600",
    use: "Secondary lines, chips, trail signs, buttons",
  },
  {
    role: "Caption",
    token: "xs",
    className: "text-xs font-medium",
    weight: "500",
    use: "Axis labels, times, tab bar labels, badges",
  },
] as const;

const WEIGHTS = [
  { label: "Regular 400, to read", className: "font-normal" },
  { label: "Medium 500, for labels", className: "font-medium" },
  { label: "Semibold 600, to name or rank", className: "font-semibold" },
] as const;

function Scale() {
  return (
    <Specimen
      title="Typography"
      lead="Figtree for everything. Six sizes, each with one job: a new size needs a new role."
    >
      <ul className="rounded-l bg-paper px-m shadow-outline">
        {SCALE.map(({ role, token, className, weight, use }) => (
          <li
            key={token}
            className="grid gap-s border-b-[1.5px] border-line py-m last:border-b-0 tablet:grid-cols-[14rem_1fr] tablet:items-baseline"
          >
            <div className="grid">
              <span className="text-s font-semibold">{role}</span>
              <span className="text-xs text-ink-soft">
                text-{token} · weight {weight}
              </span>
              <span className="text-xs text-ink-soft">
                size <TokenValue variable={`--text-${token}`} />
              </span>
              <span className="text-xs text-ink-soft">
                line height{" "}
                <TokenValue variable={`--text-${token}--line-height`} />
              </span>
              <span className="text-xs text-ink-soft">{use}</span>
            </div>
            <p className={className}>{SAMPLE}</p>
          </li>
        ))}
      </ul>
    </Specimen>
  );
}

function Weights() {
  return (
    <Specimen
      title="Weights and figures"
      lead="Three weights, and tabular figures wherever numbers line up."
    >
      <div className="grid gap-s rounded-l bg-paper p-m text-m shadow-outline">
        {WEIGHTS.map(({ label, className }) => (
          <p key={label} className={className}>
            {label} · {SAMPLE}
          </p>
        ))}
        <p className="tabular-nums">Tabular figures · 0123456789</p>
      </div>
    </Specimen>
  );
}

const meta = {
  title: "Foundations/Typography",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const TextScale: Story = { render: () => <Scale /> };

export const WeightsAndFigures: Story = { render: () => <Weights /> };
