import { Menu as BaseMenu } from "@base-ui/react/menu";
import { DotsThreeIcon } from "@phosphor-icons/react/DotsThree";
import {
  type ComponentProps,
  type ReactNode,
  use,
  useId,
  useMemo,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
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
  type ItemProps,
  LinkItem,
  type LinkItemProps,
  Separator,
} from "./menu-items";
export { Popup, type PopupProps, type PopupState } from "./menu-popup";

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
