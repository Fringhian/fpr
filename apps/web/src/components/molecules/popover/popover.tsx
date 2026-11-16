import { Popover as BasePopover } from "@base-ui/react/popover";
import { InfoIcon } from "@phosphor-icons/react/Info";
import {
  type ComponentProps,
  type CSSProperties,
  createContext,
  type ReactNode,
  use,
  useCallback,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { cn, stateClassName } from "../../../lib/cn";
import { COLLISION_PADDING } from "../../../lib/popup";
import { usePhone } from "../../../lib/use-phone";
import { IconButton } from "../../atoms/icon-button/icon-button";
import { TextLink, type TextLinkProps } from "../../atoms/text-link/text-link";
import type { IconProps } from "../../foundations/icon/icon";
import * as Dialog from "../dialog/dialog";

/** The address of How FPR works. Each section is a fragment of it: `/help#cash`. */
export const HELP_PATH = "/help";

/** True inside a popover that opens as a dialog, on phone. */
const DialogContext = createContext(false);

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

export interface InfoTriggerOwnProps {
  /** Names the idea it explains, for screen readers, usually the popover's title: “What the race shows”. */
  label: string;
  /** The button's icon, any Phosphor icon. An info sign by default. */
  icon?: IconProps["icon"] | undefined;
}

/**
 * The trigger's own props, then every prop of `Trigger` but `children` and
 * `render`: it draws its own icon button. `className` is a string, or a
 * function of the trigger's state, and wins over the icon button's classes.
 */
export type InfoTriggerProps = InfoTriggerOwnProps &
  Omit<TriggerProps, keyof InfoTriggerOwnProps | "children" | "render">;

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

/** Every prop of Base UI's `Popover.Title`, `className` included: a string, or a function of its state. */
export type TitleProps = ComponentProps<typeof BasePopover.Title>;

/**
 * The popover's heading, which names it for screen readers: “What the race
 * shows”. On phone, the dialog's title, with the close button at the end of
 * its row.
 */
export function Title({ className, ...props }: TitleProps) {
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

/** Every prop of Base UI's `Popover.Description`, `className` included: a string, or a function of its state. */
export type DescriptionProps = ComponentProps<typeof BasePopover.Description>;

/** The one or two sentences that explain it, read with the title by screen readers. On phone, the dialog's description. */
export function Description({ className, ...props }: DescriptionProps) {
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

export interface HelpLinkOwnProps {
  /** The id of the How FPR works section that explains it in full: `cash` goes to `/help#cash`. */
  section: string;
}

/**
 * The link's own props, then every prop of the text link but its address,
 * `toPage` and its label, which it sets itself. `toPageIcon` changes the icon
 * at its end, a caret by default.
 */
export type HelpLinkProps = HelpLinkOwnProps &
  Omit<TextLinkProps, keyof HelpLinkOwnProps | "href" | "toPage" | "children">;

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
