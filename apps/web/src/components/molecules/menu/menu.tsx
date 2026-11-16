import { Menu as BaseMenu } from "@base-ui/react/menu";
import { DotsThreeIcon } from "@phosphor-icons/react/DotsThree";
import {
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  use,
  useId,
  useMemo,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { stateClassName } from "../../../lib/cn";
import { COLLISION_PADDING } from "../../../lib/popup";
import { usePhone } from "../../../lib/use-phone";
import {
  IconButton,
  type IconButtonProps,
} from "../../atoms/icon-button/icon-button";
import type { IconProps } from "../../foundations/icon/icon";
import * as Dialog from "../dialog/dialog";
import { type Sheet, SheetContext } from "./menu-sheet";

export {
  Item,
  type ItemOwnProps,
  type ItemProps,
  LinkItem,
  type LinkItemProps,
  Separator,
} from "./menu-items";

/**
 * The props a popup menu and a sheet share: Base UI's `Menu.Root` props that
 * `Dialog.Root` takes too. `onOpenChange` gets the reason the menu or the
 * sheet opened or closed.
 */
export type RootProps = Pick<
  BaseMenu.Root.Props,
  | "open"
  | "defaultOpen"
  | "onOpenChange"
  | "onOpenChangeComplete"
  | "actionsRef"
> & {
  children?: ReactNode;
};

/**
 * The menu's state, open or not. From tablet up, it opens a popup beside its
 * trigger, Base UI's `Menu`; on phone, a sheet rising from the bottom, Base
 * UI's `Dialog`. The width is checked as the menu renders, so every part
 * inside follows the same choice.
 */
export function Root({ actionsRef, children, ...props }: RootProps) {
  const phone = usePhone();
  const triggerId = useId();
  const ownActions = useRef<BaseMenu.Root.Actions>(null);

  const actions = actionsRef ?? ownActions;
  const sheet = useMemo<Sheet>(
    () => ({ triggerId, close: () => actions.current?.close() }),
    [triggerId, actions],
  );

  return phone ? (
    <Dialog.Root {...props} actionsRef={actions}>
      <SheetContext value={sheet}>{children}</SheetContext>
    </Dialog.Root>
  ) : (
    <BaseMenu.Root {...props} actionsRef={actionsRef}>
      {children}
    </BaseMenu.Root>
  );
}

/**
 * Every prop of Base UI's `Menu.Trigger` but those only a popup menu has
 * (`openOnHover`, `delay`, `closeDelay`, `handle`, `payload`) and `id`, which
 * names the sheet on phone.
 */
export type TriggerProps = Omit<
  ComponentProps<typeof BaseMenu.Trigger>,
  "openOnHover" | "delay" | "closeDelay" | "handle" | "payload" | "id"
>;

/** The element that opens the menu: a `<button>`, or the element `render` gives. Base UI's `Menu.Trigger`, or `Dialog.Trigger` on phone. */
export function Trigger(props: TriggerProps) {
  const sheet = use(SheetContext);

  return sheet === null ? (
    <BaseMenu.Trigger {...props} />
  ) : (
    <Dialog.Trigger {...props} id={sheet.triggerId} />
  );
}

/**
 * The trigger's own props, then every prop of `Trigger` but `children` and
 * `render`: it draws its own icon button. `className` is a string, or a
 * function of the trigger's state, and wins over the icon button's classes.
 */
export type MoreTriggerProps = {
  /** What the actions act on, named in the label: “More actions for World Index ETF”. Without it, “More actions”. */
  subject?: string | undefined;
  /** The button's icon, any Phosphor icon. Three dots by default. */
  icon?: IconProps["icon"] | undefined;
  /** The icon button's size: `m` 40px, the default; `s` 24px, in a card's or a row's corner. */
  size?: IconButtonProps["size"] | undefined;
} & Omit<TriggerProps, "subject" | "icon" | "size" | "children" | "render">;

/** The icon button, three dots by default, that opens a card's or a row's menu, named for screen readers by what it acts on. */
export function MoreTrigger({
  subject,
  icon = DotsThreeIcon,
  size,
  ...props
}: MoreTriggerProps) {
  const { t } = useTranslation();

  const label =
    subject === undefined ? t("menu.more") : t("menu.moreFor", { subject });

  return (
    <Trigger
      {...props}
      render={<IconButton icon={icon} label={label} size={size} />}
    />
  );
}

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
