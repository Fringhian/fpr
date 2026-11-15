import { Menu as BaseMenu } from "@base-ui/react/menu";
import { DotsThreeIcon } from "@phosphor-icons/react/DotsThree";
import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import type { IconProps } from "./icon";
import { IconButton } from "./icon-button";

/** The menu's state: open or not, its trigger, `modal`. Base UI's `Menu.Root`. */
export const Root = BaseMenu.Root;

/** The element that opens the menu: a `<button>`, or the element `render` gives. Base UI's `Menu.Trigger`. */
export const Trigger = BaseMenu.Trigger;

export interface MoreTriggerOwnProps {
  /** What the actions act on, named in the label: “More actions for World Index ETF”. Without it, “More actions”. */
  subject?: string | undefined;
  /** The button's icon, any Phosphor icon. Three dots by default. */
  icon?: IconProps["icon"] | undefined;
}

/**
 * The trigger's own props, then every prop of Base UI's `Menu.Trigger` but
 * `children` and `render`: it draws its own icon button. `className` is a
 * string, or a function of the trigger's state, and wins over the icon
 * button's classes.
 */
export type MoreTriggerProps = MoreTriggerOwnProps &
  Omit<
    ComponentProps<typeof BaseMenu.Trigger>,
    keyof MoreTriggerOwnProps | "children" | "render"
  >;

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
    <BaseMenu.Trigger
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
 * The popup's placement, then every prop of Base UI's `Menu.Popup`,
 * `className` included: a string, or a function of the popup's state.
 */
export type PopupProps = Placement &
  Omit<ComponentProps<typeof BaseMenu.Popup>, keyof Placement>;

/**
 * The floating list of items, in a portal, placed beside the trigger: below it
 * and aligned to its end unless `side` and `align` say otherwise. It fades and
 * scales in from the trigger, without motion when the reader asks for less.
 */
export function Popup({
  side = "bottom",
  align = "end",
  sideOffset = 8,
  alignOffset = 0,
  className,
  ...props
}: PopupProps) {
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
        />
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

const item = cva(
  [
    "flex cursor-pointer items-center gap-s rounded-[0.625rem] bg-transparent px-[0.75rem] py-s text-start no-underline outline-none select-none",
    "",
    "",
    "",
    "highlighted:bg-highlight",
    "disabled:cursor-not-allowed disabled:opacity-[0.45]",
  ],
  {
    variants: {
      intent: { default: "text-primary", danger: "text-error" },
    },
    defaultVariants: { intent: "default" },
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

/** An action. Choosing it, by click, Enter or Space, runs `onClick` and closes the menu. */
export function Item({ intent = "default", className, ...props }: ItemProps) {
  const classes = item({ intent });

  return (
    <BaseMenu.Item
      {...props}
      className={(state) =>
        cn(
          classes,
          typeof className === "function" ? className(state) : className,
        )
      }
    />
  );
}

/**
 * The item's own props, then every prop of Base UI's `Menu.LinkItem`,
 * `className` included: a string, or a function of the item's state.
 */
export type LinkItemProps = ItemOwnProps &
  Omit<ComponentProps<typeof BaseMenu.LinkItem>, keyof ItemOwnProps>;

/** An item that goes to another page: an `<a>`, or the router's link through `render`. */
export function LinkItem({
  intent = "default",
  className,
  ...props
}: LinkItemProps) {
  const classes = item({ intent });

  return (
    <BaseMenu.LinkItem
      {...props}
      className={(state) =>
        cn(
          classes,
          typeof className === "function" ? className(state) : className,
        )
      }
    />
  );
}

/** Every prop of Base UI's `Menu.Separator`, `className` included: a string, or a function of its state. */
export type SeparatorProps = ComponentProps<typeof BaseMenu.Separator>;

/** A line between groups of items, such as before the danger item. */
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
