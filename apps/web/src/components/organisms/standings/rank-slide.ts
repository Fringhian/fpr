import { type RefCallback, useCallback, useLayoutEffect, useRef } from "react";
import { cssVariable } from "../../../lib/css-variable";

/** Where each lane of the list sits, by member id, measured from the list's top. */
function laneTops(list: HTMLOListElement): Map<string, number> {
  const tops = new Map<string, number>();
  for (const item of list.children) {
    if (item instanceof HTMLElement && item.dataset.member !== undefined) {
      tops.set(item.dataset.member, item.offsetTop);
    }
  }
  return tops;
}

/** The slide's timing: the `l` duration and the soft easing of `theme.css`. */
function slideTiming(): KeyframeAnimationOptions {
  return {
    duration: Number.parseFloat(cssVariable("--transition-duration-l")) || 0,
    easing: cssVariable("--ease-soft") || "linear",
  };
}

/** Slides each lane that moved from its old top to its new one; only its vertical position animates. */
function slideLanes(
  list: HTMLOListElement,
  before: Map<string, number>,
  after: Map<string, number>,
): void {
  const timing = slideTiming();
  for (const item of list.children) {
    const id = item instanceof HTMLElement ? item.dataset.member : undefined;
    const from = id === undefined ? undefined : before.get(id);
    const to = id === undefined ? undefined : after.get(id);
    if (from === undefined || to === undefined || from === to) {
      continue;
    }
    for (const running of item.getAnimations()) {
      running.cancel();
    }
    item.animate(
      [{ transform: `translateY(${from - to}px)` }, { transform: "none" }],
      timing,
    );
  }
}

/**
 * Slides each lane from its old place to its new one when `order`, the
 * members' ids in rank order, changes; not at all under reduced motion.
 * Returns the ref for the list, whose items carry `data-member`.
 */
export function useRankSlide(order: string): RefCallback<HTMLOListElement> {
  const list = useRef<HTMLOListElement | null>(null);
  const tops = useRef(new Map<string, number>());
  const shownOrder = useRef("");

  // Every commit: compare with where the lanes were, then remember where they are.
  useLayoutEffect(() => {
    const element = list.current;
    if (element === null) {
      return;
    }
    const before = tops.current;
    tops.current = laneTops(element);
    const reordered = shownOrder.current !== "" && shownOrder.current !== order;
    shownOrder.current = order;
    if (
      reordered &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      slideLanes(element, before, tops.current);
    }
  });

  // A lane opening or shutting, or the page resizing, moves the lanes with no
  // new order: measure again once the list resizes or a panel's height settles.
  return useCallback((element: HTMLOListElement | null) => {
    if (element === null) {
      return;
    }
    list.current = element;
    const measure = () => {
      tops.current = laneTops(element);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.addEventListener("transitionend", measure);
    return () => {
      observer.disconnect();
      element.removeEventListener("transitionend", measure);
      list.current = null;
      tops.current = new Map();
      shownOrder.current = "";
    };
  }, []);
}
