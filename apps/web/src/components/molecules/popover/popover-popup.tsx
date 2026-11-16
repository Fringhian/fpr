import { Popover as BasePopover } from "@base-ui/react/popover";
import {
  type ComponentProps,
  type CSSProperties,
  type Ref,
  type RefObject,
  use,
  useCallback,
  useRef,
} from "react";
import { stateClassName } from "../../../lib/cn";
import { COLLISION_PADDING } from "../../../lib/popup";
import * as Dialog from "../dialog/dialog";
import { DialogContext } from "./popover-context";

/** Where the popup goes beside its trigger. Base UI's `Popover.Positioner` props. */
type Placement = Pick<
  BasePopover.Positioner.Props,
  "side" | "align" | "sideOffset" | "alignOffset"
>;

/** What the popup's `className` and `style` functions are given: the state a popover and a dialog share. */
export type PopupState = Pick<
  BasePopover.Popup.State,
  "open" | "transitionStatus"
>;

const popup =
  "popup-motion w-[17.5rem] max-w-(--available-width) origin-(--transform-origin) rounded-card bg-surface px-m py-[0.875rem] font-sans text-s text-primary shadow-float outline-none";

/**
 * The popup's placement, then every prop of Base UI's `Popover.Popup` but
 * `render`. `className` and `style` are values, or functions of the state a
 * popover and a dialog share.
 */
export type PopupProps = Placement &
  Omit<
    ComponentProps<typeof BasePopover.Popup>,
    keyof Placement | "render" | "className" | "style"
  > & {
    className?:
      | string
      | ((state: PopupState) => string | undefined)
      | undefined;
    style?:
      | CSSProperties
      | ((state: PopupState) => CSSProperties | undefined)
      | undefined;
  };

/** The popup's own ref, which it focuses on opening, joined to the caller's `ref`. */
function usePopupRef(
  ref: Ref<HTMLDivElement> | undefined,
): [RefObject<HTMLDivElement | null>, (node: HTMLDivElement | null) => void] {
  const popupRef = useRef<HTMLDivElement | null>(null);
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      popupRef.current = node;
      if (typeof ref === "function") {
        return ref(node);
      }
      if (ref) {
        ref.current = node;
      }
    },
    [ref],
  );

  return [popupRef, setRefs];
}

/**
 * The card. From tablet up, a floating card in a portal beside the trigger:
 * below it and centred on it unless `side` and `align` say otherwise, fading
 * and scaling in from it. On phone, a dialog rising from the bottom as a
 * sheet, its title beside a close button. Opening either focuses the card
 * itself, so a screen reader reads its title and sentences first and Tab goes
 * on to its link. Neither moves when the reader asks for less motion.
 */
export function Popup({
  side = "bottom",
  align = "center",
  sideOffset = 8,
  alignOffset = 0,
  initialFocus,
  ref,
  className,
  ...props
}: PopupProps) {
  const dialog = use(DialogContext);
  const [popupRef, setRefs] = usePopupRef(ref);

  if (dialog) {
    return (
      <Dialog.Popup
        {...props}
        ref={setRefs}
        initialFocus={initialFocus ?? popupRef}
        className={className}
      />
    );
  }

  return (
    <BasePopover.Portal>
      <BasePopover.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={COLLISION_PADDING}
        className="z-50"
      >
        <BasePopover.Popup
          {...props}
          ref={setRefs}
          initialFocus={initialFocus ?? popupRef}
          className={stateClassName(popup, className)}
        />
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}
