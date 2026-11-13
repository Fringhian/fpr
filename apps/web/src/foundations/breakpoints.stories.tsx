import type { Meta, StoryObj } from "@storybook/react-vite";
import { Specimen, TokenValue } from "./specimen";

const BREAKPOINTS = [
  {
    name: "Phone",
    prefix: "none, the base",
    variable: undefined,
    use: "Floating tab bar, 16px side gutter",
  },
  {
    name: "Tablet",
    prefix: "tablet:",
    variable: "--breakpoint-tablet",
    use: "Navigation rail, cards two per row",
  },
  {
    name: "Desktop",
    prefix: "desktop:",
    variable: "--breakpoint-desktop",
    use: "Sidebar, content up to 1120px",
  },
] as const;

function Breakpoints() {
  return (
    <Specimen
      title="Breakpoints"
      lead="Mobile first: phone is the unprefixed base, then tablet and desktop. Switch the viewport to see the current one change."
    >
      <p className="mb-l rounded-l bg-paper p-m text-l font-semibold shadow-rest">
        Current width: <span className="tablet:hidden">phone</span>
        <span className="hidden tablet:inline desktop:hidden">tablet</span>
        <span className="hidden desktop:inline">desktop</span>
      </p>
      <ul className="grid gap-s tablet:grid-cols-3">
        {BREAKPOINTS.map(({ name, prefix, variable, use }) => (
          <li
            key={name}
            className="grid gap-xs rounded-l bg-paper p-m shadow-outline"
          >
            <span className="text-s font-semibold">{name}</span>
            <span className="text-xs text-ink-soft">Prefix: {prefix}</span>
            {variable === undefined ? (
              <span className="text-xs text-ink-soft">From 0</span>
            ) : (
              <span className="text-xs text-ink-soft">
                From <TokenValue variable={variable} />
              </span>
            )}
            <span className="text-xs text-ink-soft">{use}</span>
          </li>
        ))}
      </ul>
    </Specimen>
  );
}

const meta = {
  title: "Foundations/Breakpoints",
  component: Breakpoints,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Breakpoints>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Phone: Story = { globals: { viewport: { value: "phone" } } };

export const Tablet: Story = { globals: { viewport: { value: "tablet" } } };

export const Desktop: Story = { globals: { viewport: { value: "desktop" } } };
