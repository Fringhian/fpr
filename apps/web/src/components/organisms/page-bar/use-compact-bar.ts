import { type RefObject, useEffect, useLayoutEffect, useState } from "react";
import { usePhone } from "../../../lib/use-phone";

/**
 * Where the compact bar stands: `away` while the page bar is in view, `shown`
 * once it has scrolled past, and on phone `tucked` above the top while the
 * page scrolls down.
 */
export type CompactBarState = "away" | "tucked" | "shown";

/** The window's scroll offset, clamped to its range so an overscroll bounce at either end reads as no move. */
function scrollOffset(): number {
  const top = Math.max(window.scrollY, 0);
  if (top === 0) return 0;
  const end = document.documentElement.scrollHeight - window.innerHeight;
  return Math.min(top, Math.max(end, 0));
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
    // Only the phone follows the direction, so a wider window never reads
    // the page's height.
    let last = phone ? scrollOffset() : 0;
    let up = false;
    let frame = 0;
    // Runs once per frame, after the scroll or resize events of that frame,
    // so the layout is read at most once a frame.
    const update = () => {
      frame = 0;
      if (phone && window.scrollY !== last) {
        const offset = scrollOffset();
        if (offset !== last) up = offset < last;
        last = offset;
      }
      const bar = anchor.current;
      const past = bar !== null && bar.getBoundingClientRect().bottom <= 0;
      setScroll((current) =>
        current.past === past && current.up === up ? current : { past, up },
      );
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [anchor, phone]);

  if (!scroll.past) return "away";
  return phone && !scroll.up ? "tucked" : "shown";
}

/**
 * Keeps `--column-left` and `--column-width` on the element at its place in
 * the window, so a fixed child spans the same column. It measures before the
 * first paint, then again when the element resizes or the window does.
 */
export function useColumnSpan(holder: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const element = holder.current;
    if (element === null) return;
    const measure = () => {
      const { left, width } = element.getBoundingClientRect();
      element.style.setProperty("--column-left", `${left}px`);
      element.style.setProperty("--column-width", `${width}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [holder]);
}
