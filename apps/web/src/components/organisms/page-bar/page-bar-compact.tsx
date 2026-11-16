import { cva } from "class-variance-authority";
import { type ComponentProps, type RefObject, useRef } from "react";
import { cn } from "../../../lib/cn";
import { Root } from "./page-bar-parts";
import { useColumnSpan, useCompactBar } from "./use-compact-bar";

// Fixed rather than sticky, so focus moving into the bar never scrolls the
// page; it spans the column its holder sits in, and the layout sets its
// gutters. Under reduced motion it fades in and out without sliding.
const compact = cva(
  [
    "fixed top-0 left-(--column-left,0px) z-30 w-(--column-width,100%) frosted border-b-[1.5px] border-divider transition-[translate,opacity,visibility] duration-l ease-soft",
    "h-[calc(var(--compact-bar)+var(--safe-top))]",
    "tablet:h-[calc(var(--compact-bar)+var(--safe-top))]",
    "desktop:h-[calc(var(--compact-bar)+var(--safe-top))]",
    "motion-reduce:translate-y-0",
  ],
  {
    variants: {
      state: {
        // Out of reach while the page bar is in view, so its controls are
        // never there twice.
        away: ["pointer-events-none invisible -translate-y-full opacity-0"],
        // Tucked, it stays in the tab order: keyboard focus moving into it
        // brings it back. A tap focuses without `:focus-visible`, so it
        // leaves the bar tucked as the page scrolls on.
        tucked: [
          "pointer-events-none visible -translate-y-full opacity-0",
          "",
          "",
          "",
          "has-focus-visible:pointer-events-auto has-focus-visible:translate-y-0 has-focus-visible:opacity-100",
        ],
        shown: ["pointer-events-auto visible translate-y-0 opacity-100"],
      },
    },
  },
);

export type CompactProps = {
  /** The page bar it stands in for, once that bar has scrolled past the top. */
  anchor: RefObject<HTMLElement | null>;
} & ComponentProps<"div">;

/**
 * The compact bar pinned at the top, under the safe area, once the page bar
 * has scrolled away; the sky scrolls away with it. It holds the same parts:
 * the title, then `Controls` with the period control and, on phone, the
 * account menu, bound to the same setting. On tablet and desktop it stays
 * pinned; on phone it tucks away on scroll down and comes back on the first
 * scroll up, or when keyboard focus moves into it. The layout places it first
 * in the page's column, outside the gutters, and sets its gutters; it spans
 * that column. Its state is in `data-state`.
 */
export function Compact({ anchor, className, ...props }: CompactProps) {
  const holder = useRef<HTMLDivElement>(null);
  const state = useCompactBar(anchor);
  useColumnSpan(holder);

  return (
    <div ref={holder} className="h-0">
      <Root
        {...props}
        data-state={state}
        className={cn(compact({ state }), className)}
      />
    </div>
  );
}
