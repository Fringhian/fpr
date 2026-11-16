import { Popover as BasePopover } from "@base-ui/react/popover";
import { InfoIcon } from "@phosphor-icons/react/Info";
import { type ComponentProps, type ReactNode, use } from "react";
import { useTranslation } from "react-i18next";
import { cn, stateClassName } from "../../../lib/cn";
import { usePhone } from "../../../lib/use-phone";
import { IconButton } from "../../atoms/icon-button/icon-button";
import { TextLink, type TextLinkProps } from "../../atoms/text-link/text-link";
import type { IconProps } from "../../foundations/icon/icon";
import * as Dialog from "../dialog/dialog";
import { DialogContext } from "./popover-context";

export {
  Popup,
  type PopupProps,
  type PopupState,
} from "./popover-popup";

/** The address of How FPR works. Each section is a fragment of it: `/help#cash`. */
export const HELP_PATH = "/help";

/**
 * The props a popover and a dialog share: Base UI's `Popover.Root` props that
 * `Dialog.Root` takes too. `onOpenChange` gets the reason it opened or closed.
 * `modal` applies from tablet up: the dialog on phone is always modal.
 */
export type RootProps = Pick<
  BasePopover.Root.Props,
  | "open"
  | "defaultOpen"
  | "onOpenChange"
  | "onOpenChangeComplete"
  | "actionsRef"
  | "modal"
> & {
  children?: ReactNode;
};

/**
 * The popover's state, open or not. From tablet up, it opens a card beside its
 * trigger, Base UI's `Popover`; on phone, a dialog, Base UI's `Dialog`, which
 * rises from the bottom as a sheet. The width is checked as the popover
 * renders, so every part inside follows the same choice.
 */
export function Root({ modal, children, ...props }: RootProps) {
  const phone = usePhone();

  return phone ? (
    <Dialog.Root {...props}>
      <DialogContext value>{children}</DialogContext>
    </Dialog.Root>
  ) : (
    <BasePopover.Root {...props} modal={modal}>
      {children}
    </BasePopover.Root>
  );
}

/**
 * Every prop of Base UI's `Popover.Trigger` but those only a popover has:
 * `openOnHover`, `delay`, `closeDelay`, `handle` and `payload`.
 */
export type TriggerProps = Omit<
  ComponentProps<typeof BasePopover.Trigger>,
  "openOnHover" | "delay" | "closeDelay" | "handle" | "payload"
>;

/** The element that opens the popover: a `<button>`, or the element `render` gives. Base UI's `Popover.Trigger`, or `Dialog.Trigger` on phone. */
export function Trigger(props: TriggerProps) {
  const dialog = use(DialogContext);

  return dialog ? (
    <Dialog.Trigger {...props} />
  ) : (
    <BasePopover.Trigger {...props} />
  );
}

/**
 * The trigger's own props, then every prop of `Trigger` but `children` and
 * `render`: it draws its own icon button. `className` is a string, or a
 * function of the trigger's state, and wins over the icon button's classes.
 */
export type InfoTriggerProps = {
  /** Names the idea it explains, for screen readers, usually the popover's title: “What the race shows”. */
  label: string;
  /** The button's icon, any Phosphor icon. An info sign by default. */
  icon?: IconProps["icon"] | undefined;
} & Omit<TriggerProps, "label" | "icon" | "children" | "render">;

/** The small icon button, an info sign by default, beside an idea that needs a sentence. */
export function InfoTrigger({
  label,
  icon = InfoIcon,
  ...props
}: InfoTriggerProps) {
  return (
    <Trigger
      {...props}
      render={<IconButton icon={icon} label={label} size="s" />}
    />
  );
}

/**
 * The popover's heading, which names it for screen readers: “What the race
 * shows”. On phone, the dialog's title, with the close button at the end of
 * its row. Every prop of Base UI's `Popover.Title`.
 */
export function Title({
  className,
  ...props
}: ComponentProps<typeof BasePopover.Title>) {
  const dialog = use(DialogContext);

  if (dialog) {
    return (
      <Dialog.Header>
        <Dialog.Title {...props} className={className} />
        <Dialog.Close />
      </Dialog.Header>
    );
  }

  return (
    <BasePopover.Title
      {...props}
      className={stateClassName("text-s font-semibold", className)}
    />
  );
}

/** The one or two sentences that explain it, read with the title by screen readers. On phone, the dialog's description. Every prop of Base UI's `Popover.Description`. */
export function Description({
  className,
  ...props
}: ComponentProps<typeof BasePopover.Description>) {
  const dialog = use(DialogContext);

  if (dialog) {
    return <Dialog.Description {...props} className={className} />;
  }

  return (
    <BasePopover.Description
      {...props}
      className={stateClassName("mt-xs text-s", className)}
    />
  );
}

/**
 * The link's own props, then every prop of the text link but its address,
 * `toPage` and its label, which it sets itself. `toPageIcon` changes the icon
 * at its end, a caret by default.
 */
export type HelpLinkProps = {
  /** The id of the How FPR works section that explains it in full: `cash` goes to `/help#cash`. */
  section: string;
} & Omit<TextLinkProps, "section" | "href" | "toPage" | "children">;

/** “More in How FPR works”, the popover's last line: a link to the help section that explains it in full. */
export function HelpLink({ section, className, ...props }: HelpLinkProps) {
  const { t } = useTranslation();
  const dialog = use(DialogContext);

  return (
    <TextLink
      {...props}
      href={`${HELP_PATH}#${section}`}
      toPage
      className={cn("block w-fit", dialog ? "" : "mt-s", className)}
    >
      {t("popover.helpLink")}
    </TextLink>
  );
}
