import { type RefObject, useLayoutEffect } from "react";

/**
 * Keeps the page's bottom scroll padding and `--bottom-bar-room` at the
 * height of the element, a bar held at the bottom of the screen, while it is
 * on the page: a focused or scrolled-to element stops above it rather than
 * under it (WCAG 2.4.11), and the toasts show above it.
 */
export function useBottomScrollRoom(element: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const bar = element.current;
    if (bar === null) return;
    const { style } = bar.ownerDocument.documentElement;
    const measure = () => {
      style.scrollPaddingBottom = `${bar.offsetHeight}px`;
      style.setProperty("--bottom-bar-room", `${bar.offsetHeight}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      style.removeProperty("scroll-padding-bottom");
      style.removeProperty("--bottom-bar-room");
    };
  }, [element]);
}
