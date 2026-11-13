import type { Meta, StoryObj } from "@storybook/react-vite";
import { Specimen, TokenValue } from "./specimen";

const STEPS = [
  { token: "xs", bar: "w-xs" },
  { token: "s", bar: "w-s" },
  { token: "m", bar: "w-m" },
  { token: "l", bar: "w-l" },
  { token: "xl", bar: "w-xl" },
] as const;

function Spacing() {
  return (
    <Specimen
      title="Spacing"
      lead="Five steps for padding, gaps, margins and sizes. Tight inside groups, generous between sections, more space above a heading than below it."
    >
      <ul className="grid gap-s rounded-l bg-surface p-m shadow-outline">
        {STEPS.map(({ token, bar }) => (
          <li key={token} className="flex items-center gap-m">
            <span className="w-[12rem] text-s">
              <span className="font-semibold">{token}</span> ·{" "}
              <TokenValue variable={`--spacing-${token}`} />
            </span>
            <span className={`h-m bg-cobalt ${bar}`} />
          </li>
        ))}
      </ul>
    </Specimen>
  );
}

const meta = {
  title: "Foundations/Spacing",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Scale: Story = { render: () => <Spacing /> };
