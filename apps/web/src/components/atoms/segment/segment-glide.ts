import {
  type Ref,
  type RefCallback,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import { motionTiming, reducedMotion } from "../../../lib/motion";

function pressedIn(group: HTMLElement | null): HTMLElement | null {
  return group?.querySelector<HTMLElement>("[data-pressed]") ?? null;
}

/**
 * Glides the charcoal capsule, the pressed item's `::before`, from the item
 * pressed before to the new one; not at all under reduced motion. `leave`
 * notes where the capsule sits as a press starts; once `selected` changes,
 * the new capsule's edges travel from there to its own. Returns `leave` and
 * the group's ref, joined with the `ref` the segment was given.
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
      reducedMotion()
    ) {
      return;
    }
    const end = capsule.getBoundingClientRect();
    capsule.animate(
      {
        left: [`${start.left - end.left}px`, "0px"],
        right: [`${end.right - start.right}px`, "0px"],
      },
      { ...motionTiming("m"), pseudoElement: "::before" },
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
