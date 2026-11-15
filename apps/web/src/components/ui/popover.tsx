import { Popover as BasePopover } from "@base-ui/react/popover";
import { InfoIcon } from "@phosphor-icons/react/Info";
import { type ComponentProps, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import { IconButton, type IconButtonProps } from "./icon-button";
import { TextLink, type TextLinkProps } from "./text-link";

/** The address of How FPR works. Each section is a fragment of it: `/help#cash`. */
export const HELP_PATH = "/help";

/** The popover's state: open or not, its trigger. Base UI's `Popover.Root`. */
export const Root = BasePopover.Root;

/** The element that opens the popover: a `<button>`, or the element `render` gives. Base UI's `Popover.Trigger`. */
export const Trigger = BasePopover.Trigger;

export interface InfoTriggerProps
  extends Omit<
    IconButtonProps,
    "icon" | "size" | "children" | "render" | "nativeButton"
  > {
  /** Names the idea it explains, for screen readers, usually the popover's title: “What the race shows”. */
  label: string;
}

/** The small ⓘ button beside an idea that needs a sentence. */
export function InfoTrigger({ className, ...props }: InfoTriggerProps) {
  return (
    <BasePopover.Trigger
      render={
        <IconButton
          {...props}
          icon={InfoIcon}
          size="s"
          className={cn(
            "",
            "",
            "",
            "",
            "popup-open:bg-highlight popup-open:text-primary",
            className,
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

export type PopupProps = Placement & ComponentProps<typeof BasePopover.Popup>;

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
          className={cn(
            "w-[17.5rem] max-w-(--available-width) origin-(--transform-origin) rounded-[1.125rem] bg-surface px-m py-[0.875rem] font-sans text-s text-primary shadow-float outline-none",
            "",
            "",
            "",
            "transition-[opacity,scale] duration-150 ease-out motion-reduce:transition-none",
            "starting-style:scale-[0.96] starting-style:opacity-0",
            "ending-style:scale-[0.96] ending-style:opacity-0",
            className,
          )}
        />
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}

/** The popover's heading, which names it for screen readers: “What the race shows”. */
export function Title({
  className,
  ...props
}: ComponentProps<typeof BasePopover.Title>) {
  return (
    <BasePopover.Title
      {...props}
      className={cn("text-s font-semibold", className)}
    />
  );
}

/** The one or two sentences that explain it, read with the title by screen readers. */
export function Description({
  className,
  ...props
}: ComponentProps<typeof BasePopover.Description>) {
  return (
    <BasePopover.Description
      {...props}
      className={cn("mt-xs text-s", className)}
    />
  );
}

export interface HelpLinkProps
  extends Omit<TextLinkProps, "href" | "caret" | "children"> {
  /** The id of the How FPR works section that explains it in full: `cash` goes to `/help#cash`. */
  section: string;
}

/** “More in How FPR works”, the popover's last line: a link to the help section that explains it in full. */
export function HelpLink({ section, className, ...props }: HelpLinkProps) {
  const { t } = useTranslation();
  return (
    <TextLink
      {...props}
      href={`${HELP_PATH}#${section}`}
      caret
      className={cn("mt-s block w-fit", className)}
    >
      {t("popover.helpLink")}
    </TextLink>
  );
}
