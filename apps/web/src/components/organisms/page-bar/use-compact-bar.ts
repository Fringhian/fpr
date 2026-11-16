import { type RefObject, useEffect, useState } from "react";
import { usePhone } from "../../../lib/use-phone";

/**
 * Where the compact bar stands: `away` while the page bar is in view, `shown`
 * once it has scrolled past, and on phone `tucked` above the top while the
 * page scrolls down.
 */
export type CompactBarState = "away" | "tucked" | "shown";

/** The window's scroll offset, clamped to its range so an overscroll bounce at either end reads as no move. */
function scrollOffset(): number {
  const end = document.documentElement.scrollHeight - window.innerHeight;
  return Math.min(Math.max(window.scrollY, 0), Math.max(end, 0));
}

/**
 * The compact bar's state, from the page bar it stands in for: it shows once
 * that bar's bottom has passed the top of the window. On tablet and desktop
 * it then stays pinned; on phone it tucks away on every scroll down and comes
 * back on the first scroll up.
 */
export function useCompactBar(
  anchor: RefObject<HTMLElement | null>,
): CompactBarState {
  const phone = usePhone();
  const [scroll, setScroll] = useState({ past: false, up: false });

  useEffect(() => {
    let last = scrollOffset();
    let up = false;
    const update = () => {
      const offset = scrollOffset();
      // Only the phone follows the direction, so a wider window never
      // re-renders on it.
      if (phone && offset !== last) up = offset < last;
      last = offset;
      const bar = anchor.current;
      const past = bar !== null && bar.getBoundingClientRect().bottom <= 0;
      setScroll((current) =>
        current.past === past && current.up === up ? current : { past, up },
      );
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [anchor, phone]);

  if (!scroll.past) return "away";
  return phone && !scroll.up ? "tucked" : "shown";
}

/**
 * Keeps `--column-left` and `--column-width` on the element at its place in
 * the window, so a fixed child spans the same column.
 */
export function useColumnSpan(holder: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = holder.current;
    if (element === null) return;
    const observer = new ResizeObserver(() => {
      const { left, width } = element.getBoundingClientRect();
      element.style.setProperty("--column-left", `${left}px`);
      element.style.setProperty("--column-width", `${width}px`);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [holder]);
}
