import {
  type Ref,
  type RefCallback,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import { cssVariable } from "../../../lib/css-variable";

function pressedIn(group: HTMLElement | null): HTMLElement | null {
  return group?.querySelector<HTMLElement>("[data-pressed]") ?? null;
}

/**
 * Glides the charcoal capsule, the pressed item's `::before`, from the item
 * pressed before to the new one; not at all under reduced motion. `leave`
 * notes where the capsule sits as a press starts; once `selected` changes,
 * the new capsule travels from there to its own place and width. Returns
 * `leave` and the group's ref, joined with the `ref` the segment was given.
 */
export function useGlide(
  selected: string | undefined,
  ref: Ref<HTMLDivElement> | undefined,
): { groupRef: RefCallback<HTMLDivElement>; leave: () => void } {
  const group = useRef<HTMLDivElement | null>(null);
  const from = useRef<DOMRect | null>(null);

  useLayoutEffect(() => {
    const start = from.current;
    from.current = null;
    const capsule = pressedIn(group.current);
    if (
      start === null ||
      selected === undefined ||
      capsule === null ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const end = capsule.getBoundingClientRect();
    // Transform only, so the compositor runs the glide while the page
    // re-renders for the new value; the capsule's origin is its left edge.
    capsule.animate(
      {
        transform: [
          `translateX(${start.left - end.left}px) scaleX(${start.width / end.width})`,
          "none",
        ],
      },
      {
        duration:
          Number.parseFloat(cssVariable("--transition-duration-m")) || 0,
        easing: cssVariable("--ease-soft") || "linear",
        pseudoElement: "::before",
      },
    );
  }, [selected]);

  const groupRef = useCallback(
    (element: HTMLDivElement | null) => {
      group.current = element;
      if (typeof ref === "function") {
        return ref(element);
      }
      if (ref) {
        ref.current = element;
      }
    },
    [ref],
  );

  const leave = useCallback(() => {
    from.current = pressedIn(group.current)?.getBoundingClientRect() ?? null;
  }, []);

  return { groupRef, leave };
}
