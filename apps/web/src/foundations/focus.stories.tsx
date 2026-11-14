import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, userEvent, within } from "storybook/test";
import { cn } from "../lib/cn";
import { Specimen } from "./specimen";

const GROUNDS = [
  {
    name: "Page",
    className: "bg-page",
    captionClassName: "text-secondary",
    use: "Warm Snow, under every page",
  },
  {
    name: "Surface",
    className: "bg-surface shadow-outline",
    captionClassName: "text-secondary",
    use: "White, inside cards, dialogs and sheets",
  },
  {
    name: "Sky",
    className: "bg-sky",
    captionClassName: "text-on-sky",
    use: "Peach, the sky header and the sky panel",
  },
] as const;

const PRIMARY =
  "rounded-full bg-primary px-m py-s text-s font-semibold text-on-primary";
const SECONDARY =
  "rounded-full bg-surface px-m py-s text-s font-semibold text-primary shadow-outline";

/** One ground and the controls that sit on it. */
function Ground({
  name,
  className,
  captionClassName,
  use,
  children,
}: (typeof GROUNDS)[number] & { children: ReactNode }) {
  return (
    <li className={cn("grid gap-m rounded-l p-l", className)}>
      <span className="grid gap-xs">
        <span className="text-s font-semibold">{name}</span>
        <span className={cn("text-xs", captionClassName)}>{use}</span>
      </span>
      <span className="flex flex-wrap gap-m">{children}</span>
    </li>
  );
}

function Grounds({ children }: { children: ReactNode }) {
  return (
    <ul
      className={cn(
        "grid gap-m",
        "grid-cols-1",
        "tablet:grid-cols-3",
        "desktop:grid-cols-3",
      )}
    >
      {children}
    </ul>
  );
}

/** The ring as drawn, on every ground, without keyboard focus. */
function Drawn() {
  return (
    <Specimen
      title="Focus"
      lead="A charcoal ring, 2px wide and 2px off the edge, on every control the keyboard reaches. It reads on the page, on cards and under the sky. Controls show it with focus-visible:focus-ring."
    >
      <Grounds>
        {GROUNDS.map((ground) => (
          <Ground key={ground.name} {...ground}>
            <span className={cn(PRIMARY, "focus-ring")}>Record a change</span>
            <span className={cn(SECONDARY, "focus-ring")}>Sell</span>
          </Ground>
        ))}
      </Grounds>
    </Specimen>
  );
}

/** Real buttons: the ring follows the keyboard. */
function Keyboard() {
  return (
    <Specimen
      title="Focus with the keyboard"
      lead="Press Tab to move the ring from button to button. A click shows no ring."
    >
      <Grounds>
        {GROUNDS.map((ground) => (
          <Ground key={ground.name} {...ground}>
            <button
              type="button"
              className={cn(PRIMARY, "", "", "", "focus-visible:focus-ring")}
            >
              Record a change
            </button>
            <button
              type="button"
              className={cn(SECONDARY, "", "", "", "focus-visible:focus-ring")}
            >
              Sell
            </button>
          </Ground>
        ))}
      </Grounds>
    </Specimen>
  );
}

const meta = {
  title: "Foundations/Focus",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Ring: Story = { render: () => <Drawn /> };

export const WithTheKeyboard: Story = {
  render: () => <Keyboard />,
  play: async ({ canvasElement }) => {
    const buttons = within(canvasElement).getAllByRole("button");
    for (const button of buttons) {
      await userEvent.tab();
      await expect(button).toHaveFocus();
      const ring = getComputedStyle(button);
      await expect(ring.outlineStyle).toBe("solid");
      await expect(ring.outlineWidth).toBe("2px");
      await expect(ring.outlineOffset).toBe("2px");
      await expect(ring.outlineColor).toBe("rgb(35, 38, 47)");
    }
  },
};
