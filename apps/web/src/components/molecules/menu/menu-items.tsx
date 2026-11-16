import { Menu as BaseMenu } from "@base-ui/react/menu";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva } from "class-variance-authority";
import { type ComponentProps, use } from "react";
import { stateClassName } from "../../../lib/cn";
import { type Sheet, SheetContext } from "./menu-sheet";

/** An interface's fields as a plain object type, which `useRender` takes as a state. */
type Fields<T> = { [K in keyof T]: T[K] };

const item = cva(
  [
    "flex cursor-pointer items-center gap-s rounded-[0.625rem] bg-transparent text-start text-s no-underline outline-none select-none",
    "",
    "",
    "",
    "highlighted:bg-highlight",
    "focus-visible:bg-highlight",
    "active:bg-highlight",
    "disabled:dimmed",
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

/**
 * The item's own props, then every prop of Base UI's `Menu.Item`, `className`
 * included: a string, or a function of the item's state.
 */
export type ItemProps = {
  /** `danger` (red text) for an action that deletes, revokes or signs out. Put it last, after a `Separator`. */
  intent?: "default" | "danger";
} & Omit<ComponentProps<typeof BaseMenu.Item>, "intent">;

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
      className: stateClassName(
        item({ intent, layout: "sheet" }),
        className,
      )(state),
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

  return sheet === null ? (
    <BaseMenu.Item
      {...props}
      className={stateClassName(item({ intent }), className)}
    />
  ) : (
    <SheetItem {...props} sheet={sheet} intent={intent} className={className} />
  );
}

/**
 * The item's `intent`, then every prop of Base UI's `Menu.LinkItem`,
 * `className` included: a string, or a function of the item's state.
 */
export type LinkItemProps = Pick<ItemProps, "intent"> &
  Omit<ComponentProps<typeof BaseMenu.LinkItem>, "intent">;

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
      className: stateClassName(
        item({ intent, layout: "sheet" }),
        className,
      )(state),
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

  return sheet === null ? (
    <BaseMenu.LinkItem
      {...props}
      className={stateClassName(item({ intent }), className)}
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

/** A line between groups of items, such as before the danger item, in the popup and in the sheet alike. Every prop of Base UI's `Menu.Separator`. */
export function Separator({
  className,
  ...props
}: ComponentProps<typeof BaseMenu.Separator>) {
  return (
    <BaseMenu.Separator
      {...props}
      className={stateClassName(
        "my-xs h-0 border-t-[1.5px] border-divider",
        className,
      )}
    />
  );
}
