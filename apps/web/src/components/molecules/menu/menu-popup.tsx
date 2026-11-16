import { Menu as BaseMenu } from "@base-ui/react/menu";
import { type ComponentProps, type CSSProperties, use } from "react";
import { stateClassName } from "../../../lib/cn";
import { COLLISION_PADDING } from "../../../lib/popup";
import * as Dialog from "../dialog/dialog";
import { SheetContext } from "./menu-sheet";

/** Where the popup goes beside its trigger. Base UI's `Menu.Positioner` props. */
type Placement = Pick<
  BaseMenu.Positioner.Props,
  "side" | "align" | "sideOffset" | "alignOffset"
>;

/** What the popup's `className` and `style` functions are given: the state a popup menu and a sheet share. */
export type PopupState = Pick<
  BaseMenu.Popup.State,
  "open" | "transitionStatus"
>;

const popup =
  "popup-motion flex max-w-(--available-width) min-w-[13.125rem] origin-(--transform-origin) flex-col rounded-[1rem] bg-surface p-[0.375rem] font-sans text-s text-primary shadow-float outline-none";

/**
 * The popup's placement, then every prop of Base UI's `Menu.Popup` but
 * `render`. `className` and `style` are values, or functions of the state a
 * popup menu and a sheet share.
 */
export type PopupProps = Placement &
  Omit<
    ComponentProps<typeof BaseMenu.Popup>,
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

/**
 * The list of items. From tablet up, a floating popup in a portal beside the
 * trigger: below it and aligned to its end unless `side` and `align` say
 * otherwise, fading and scaling in from it. On phone, a sheet rising from the
 * bottom, named by its trigger, with a Cancel button under the items. Neither
 * moves when the reader asks for less motion.
 */
export function Popup({
  side = "bottom",
  align = "end",
  sideOffset = 8,
  alignOffset = 0,
  className,
  children,
  ...props
}: PopupProps) {
  const sheet = use(SheetContext);

  if (sheet !== null) {
    return (
      <Dialog.Popup
        {...props}
        aria-labelledby={sheet.triggerId}
        className={className}
      >
        <div className="flex flex-col">{children}</div>
        <Dialog.Cancel />
      </Dialog.Popup>
    );
  }

  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={COLLISION_PADDING}
        className="z-50 outline-none"
      >
        <BaseMenu.Popup {...props} className={stateClassName(popup, className)}>
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}
