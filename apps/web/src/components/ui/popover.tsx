import { Popover as BasePopover } from "@base-ui/react/popover";
import { InfoIcon } from "@phosphor-icons/react/Info";
import { type ComponentProps, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import type { IconProps } from "./icon";
import { IconButton } from "./icon-button";
import { TextLink, type TextLinkProps } from "./text-link";

/** The address of How FPR works. Each section is a fragment of it: `/help#cash`. */
export const HELP_PATH = "/help";

/** The popover's state: open or not, its trigger. Base UI's `Popover.Root`. */
export const Root = BasePopover.Root;

/** The element that opens the popover: a `<button>`, or the element `render` gives. Base UI's `Popover.Trigger`. */
export const Trigger = BasePopover.Trigger;

export interface InfoTriggerOwnProps {
  /** Names the idea it explains, for screen readers, usually the popover's title: “What the race shows”. */
  label: string;
  /** The button's icon, any Phosphor icon. An info sign by default. */
  icon?: IconProps["icon"] | undefined;
}

/**
 * The trigger's own props, then every prop of Base UI's `Popover.Trigger` but
 * `children` and `render`: it draws its own icon button. `className` is a
 * string, or a function of the trigger's state, and wins over the icon
 * button's classes.
 */
export type InfoTriggerProps = InfoTriggerOwnProps &
  Omit<
    ComponentProps<typeof BasePopover.Trigger>,
    keyof InfoTriggerOwnProps | "children" | "render"
  >;

/** The small icon button, an info sign by default, beside an idea that needs a sentence. */
export function InfoTrigger({
  label,
  icon = InfoIcon,
  ...props
}: InfoTriggerProps) {
  return (
    <BasePopover.Trigger
      {...props}
      render={
        <IconButton
          icon={icon}
          label={label}
          size="s"
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

/** Where the popup goes beside its trigger. Base UI's `Popover.Positioner` props. */
type Placement = Pick<
  BasePopover.Positioner.Props,
  "side" | "align" | "sideOffset" | "alignOffset"
>;

const popup = cn(
  "w-[17.5rem] max-w-(--available-width) origin-(--transform-origin) rounded-[1.125rem] bg-surface px-m py-[0.875rem] font-sans text-s text-primary shadow-float outline-none",
  "",
  "",
  "",
  "transition-[opacity,scale] duration-150 ease-out motion-reduce:transition-none",
  "starting-style:scale-[0.96] starting-style:opacity-0",
  "ending-style:scale-[0.96] ending-style:opacity-0",
);

/**
 * The popup's placement, then every prop of Base UI's `Popover.Popup`,
 * `className` included: a string, or a function of the popup's state.
 */
export type PopupProps = Placement &
  Omit<ComponentProps<typeof BasePopover.Popup>, keyof Placement>;

/**
 * The floating card, in a portal, placed beside the trigger: below it and
 * centred on it unless `side` and `align` say otherwise. Opening it focuses the
 * card itself, so a screen reader reads its title and sentences first and Tab
 * goes on to its link. It fades and scales in from the trigger, without motion
 * when the reader asks for less.
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

  return (
    <BasePopover.Portal>
      <BasePopover.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={16}
        className="z-50"
      >
        <BasePopover.Popup
          {...props}
          ref={setRefs}
          initialFocus={initialFocus ?? popupRef}
          className={(state) =>
            cn(
              popup,
              typeof className === "function" ? className(state) : className,
            )
          }
        />
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}

/** Every prop of Base UI's `Popover.Title`, `className` included: a string, or a function of its state. */
export type TitleProps = ComponentProps<typeof BasePopover.Title>;

/** The popover's heading, which names it for screen readers: “What the race shows”. */
export function Title({ className, ...props }: TitleProps) {
  return (
    <BasePopover.Title
      {...props}
      className={(state) =>
        cn(
          "text-s font-semibold",
          typeof className === "function" ? className(state) : className,
        )
      }
    />
  );
}

/** Every prop of Base UI's `Popover.Description`, `className` included: a string, or a function of its state. */
export type DescriptionProps = ComponentProps<typeof BasePopover.Description>;

/** The one or two sentences that explain it, read with the title by screen readers. */
export function Description({ className, ...props }: DescriptionProps) {
  return (
    <BasePopover.Description
      {...props}
      className={(state) =>
        cn(
          "mt-xs text-s",
          typeof className === "function" ? className(state) : className,
        )
      }
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

  return (
    <TextLink
      {...props}
      href={`${HELP_PATH}#${section}`}
      toPage
      className={cn("mt-s block w-fit", className)}
    >
      {t("popover.helpLink")}
    </TextLink>
  );
}
