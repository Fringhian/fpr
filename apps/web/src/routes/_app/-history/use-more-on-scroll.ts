import { type RefObject, useEffect, useEffectEvent } from "react";

const AHEAD = "600px";

/**
 * Calls `load` whenever `end`, the element after a list, comes within reach
 * of the screen while `more` says another page waits. `more` turns false
 * while a page loads, so each page is asked for once.
 */
export function useMoreOnScroll(
  end: RefObject<Element | null>,
  more: boolean,
  load: () => void,
): void {
  const onReach = useEffectEvent(load);
  useEffect(() => {
    const element = end.current;
    if (!element || !more) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onReach();
      },
      { rootMargin: `0px 0px ${AHEAD} 0px` },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [end, more]);
}
