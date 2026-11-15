import { Menu as BaseMenu } from "@base-ui/react/menu";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { DotsThreeIcon } from "@phosphor-icons/react/DotsThree";
import { cva } from "class-variance-authority";
import {
  type ComponentProps,
  type CSSProperties,
  createContext,
  type ReactNode,
  use,
  useId,
  useMemo,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { usePhone } from "../../../lib/use-phone";
import { IconButton } from "../../atoms/icon-button/icon-button";
import type { IconProps } from "../../foundations/icon/icon";
import * as Dialog from "../../organisms/dialog/dialog";

/** What the parts of a menu opened as a sheet share: the trigger's id, which names the sheet, and how to close it. */
interface Sheet {
  triggerId: string;
  close: () => void;
}

/** The sheet the parts sit in, on phone. Null in a menu that opens as a popup. */
const SheetContext = createContext<Sheet | null>(null);

/** An interface's fields as a plain object type, which `useRender` takes as a state. */
type Fields<T> = { [K in keyof T]: T[K] };

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

export interface MoreTriggerOwnProps {
  /** What the actions act on, named in the label: “More actions for World Index ETF”. Without it, “More actions”. */
  subject?: string | undefined;
  /** The button's icon, any Phosphor icon. Three dots by default. */
  icon?: IconProps["icon"] | undefined;
}

/**
 * The trigger's own props, then every prop of `Trigger` but `children` and
 * `render`: it draws its own icon button. `className` is a string, or a
 * function of the trigger's state, and wins over the icon button's classes.
 */
export type MoreTriggerProps = MoreTriggerOwnProps &
  Omit<TriggerProps, keyof MoreTriggerOwnProps | "children" | "render">;

/** The icon button, three dots by default, that opens a card's or a row's menu, named for screen readers by what it acts on. */
export function MoreTrigger({
  subject,
  icon = DotsThreeIcon,
  ...props
}: MoreTriggerProps) {
  const { t } = useTranslation();

  const label =
    subject === undefined ? t("menu.more") : t("menu.moreFor", { subject });

  return (
    <Trigger
      {...props}
      render={
        <IconButton
          icon={icon}
          label={label}
          className={cn(
            "",
            "",
            "",
            "",
            "popup-open:bg-highlight popup-open:text-primary",
          )}
        />
      }
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

const popup = cn(
  "flex max-w-(--available-width) min-w-[13.125rem] origin-(--transform-origin) flex-col rounded-[1rem] bg-surface p-[0.375rem] font-sans text-s text-primary shadow-float outline-none",
  "",
  "",
  "",
  "transition-[opacity,scale] duration-150 ease-out motion-reduce:transition-none",
  "starting-style:scale-[0.96] starting-style:opacity-0",
  "ending-style:scale-[0.96] ending-style:opacity-0",
);

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
        collisionPadding={16}
        className="z-50 outline-none"
      >
        <BaseMenu.Popup
          {...props}
          className={(state) =>
            cn(
              popup,
              typeof className === "function" ? className(state) : className,
            )
          }
        >
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

const item = cva(
  [
    "flex cursor-pointer items-center gap-s rounded-[0.625rem] bg-transparent text-start text-s no-underline outline-none select-none",
    "",
    "",
    "",
    "highlighted:bg-highlight",
    "focus-visible:bg-highlight",
    "active:bg-highlight",
    "disabled:cursor-not-allowed disabled:opacity-[0.45]",
  ],
  {
    variants: {
      intent: { default: "text-primary", danger: "text-error" },
      layout: {
        popup: "px-[0.75rem] py-s",
        sheet: "min-h-[3rem] px-[0.75rem] py-s",
      },
    },
    defaultVariants: { intent: "default", layout: "popup" },
  },
);

export interface ItemOwnProps {
  /** `danger` (red text) for an action that deletes, revokes or signs out. Put it last, after a `Separator`. */
  intent?: "default" | "danger";
}

/**
 * The item's own props, then every prop of Base UI's `Menu.Item`, `className`
 * included: a string, or a function of the item's state.
 */
export type ItemProps = ItemOwnProps &
  Omit<ComponentProps<typeof BaseMenu.Item>, keyof ItemOwnProps>;

/** A sheet's item: a `<button>` that runs `onClick`, then closes the sheet unless `closeOnClick` is false. */
function SheetItem({
  sheet,
  intent = "default",
  disabled = false,
  closeOnClick = true,
  label: _label,
  nativeButton: _nativeButton,
  render,
  ref,
  className,
  style,
  ...props
}: ItemProps & { sheet: Sheet }) {
  const state: Fields<BaseMenu.Item.State> = { disabled, highlighted: false };

  return useRender({
    defaultTagName: "button",
    render,
    ref,
    state,
    props: {
      ...mergeProps<"div">(
        { onClick: closeOnClick ? sheet.close : undefined },
        props,
      ),
      type: "button",
      disabled,
      className: cn(
        item({ intent, layout: "sheet" }),
        typeof className === "function" ? className(state) : className,
      ),
      style: typeof style === "function" ? style(state) : style,
    },
  });
}

/**
 * An action. Choosing it, by tap, click, Enter or Space, runs `onClick` and
 * closes the menu. A menu item in the popup, a `<button>` in the sheet.
 */
export function Item({ intent = "default", className, ...props }: ItemProps) {
  const sheet = use(SheetContext);

  const classes = item({ intent });

  return sheet === null ? (
    <BaseMenu.Item
      {...props}
      className={(state) =>
        cn(
          classes,
          typeof className === "function" ? className(state) : className,
        )
      }
    />
  ) : (
    <SheetItem {...props} sheet={sheet} intent={intent} className={className} />
  );
}

/**
 * The item's own props, then every prop of Base UI's `Menu.LinkItem`,
 * `className` included: a string, or a function of the item's state.
 */
export type LinkItemProps = ItemOwnProps &
  Omit<ComponentProps<typeof BaseMenu.LinkItem>, keyof ItemOwnProps>;

/** A sheet's link item: an `<a>`, or the element `render` gives, that closes the sheet when `closeOnClick` is true. */
function SheetLinkItem({
  sheet,
  intent = "default",
  closeOnClick = false,
  label: _label,
  render,
  ref,
  className,
  style,
  ...props
}: LinkItemProps & { sheet: Sheet }) {
  const state: Fields<BaseMenu.LinkItem.State> = { highlighted: false };

  return useRender({
    defaultTagName: "a",
    render,
    ref,
    state,
    props: {
      ...mergeProps<"a">(
        { onClick: closeOnClick ? sheet.close : undefined },
        props,
      ),
      className: cn(
        item({ intent, layout: "sheet" }),
        typeof className === "function" ? className(state) : className,
      ),
      style: typeof style === "function" ? style(state) : style,
    },
  });
}

/**
 * An item that goes to another page: an `<a>`, or the router's link through
 * `render`, in the popup and in the sheet alike.
 */
export function LinkItem({
  intent = "default",
  className,
  ...props
}: LinkItemProps) {
  const sheet = use(SheetContext);

  const classes = item({ intent });

  return sheet === null ? (
    <BaseMenu.LinkItem
      {...props}
      className={(state) =>
        cn(
          classes,
          typeof className === "function" ? className(state) : className,
        )
      }
    />
  ) : (
    <SheetLinkItem
      {...props}
      sheet={sheet}
      intent={intent}
      className={className}
    />
  );
}

/** Every prop of Base UI's `Menu.Separator`, `className` included: a string, or a function of its state. */
export type SeparatorProps = ComponentProps<typeof BaseMenu.Separator>;

/** A line between groups of items, such as before the danger item, in the popup and in the sheet alike. */
export function Separator({ className, ...props }: SeparatorProps) {
  return (
    <BaseMenu.Separator
      {...props}
      className={(state) =>
        cn(
          "my-xs h-[0] border-t-[1.5px] border-divider",
          typeof className === "function" ? className(state) : className,
        )
      }
    />
  );
}
