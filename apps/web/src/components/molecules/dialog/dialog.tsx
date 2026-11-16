import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { XIcon } from "@phosphor-icons/react/X";
import type { ComponentProps, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn, stateClassName } from "../../../lib/cn";
import { Button } from "../../atoms/button/button";
import { IconButton } from "../../atoms/icon-button/icon-button";
import type { IconProps } from "../../foundations/icon/icon";

/**
 * Holds the dialog’s state, open or closed. Base UI’s `Dialog.Root`: `open` and `onOpenChange` to control it, `defaultOpen` to start open.
 * One dialog is open at a time: a dialog never opens another, it changes its own content.
 */
export const Root = BaseDialog.Root;

/** Opens the dialog. Base UI’s `Dialog.Trigger`: pass `render={<Button />}` to open it from a button. Focus returns here when the dialog closes. */
export const Trigger = BaseDialog.Trigger;

const popup = cn(
  "fixed z-50 flex flex-col overflow-y-auto overscroll-contain bg-surface font-sans text-primary shadow-float outline-none transition-[translate,scale,opacity] duration-m ease-soft",
  "inset-x-0 top-auto bottom-0 m-0 h-auto max-h-[calc(100dvh-2.5rem-var(--safe-top))] w-auto gap-[0.75rem] rounded-t-xl rounded-b-none px-[1.125rem] pt-[0.625rem] pb-[calc(1.375rem+env(safe-area-inset-bottom))] translate-none scale-100 opacity-100",
  "tablet:inset-0 tablet:m-auto tablet:h-fit tablet:max-h-[calc(100dvh-5rem)] tablet:w-[min(30rem,calc(100vw-3rem))] tablet:gap-[0.875rem] tablet:rounded-xl tablet:p-[1.375rem] tablet:translate-none tablet:scale-100 tablet:opacity-100",
  "desktop:inset-0 desktop:m-auto desktop:h-fit desktop:max-h-[calc(100dvh-5rem)] desktop:w-[min(30rem,calc(100vw-3rem))] desktop:gap-[0.875rem] desktop:rounded-xl desktop:p-[1.375rem] desktop:translate-none desktop:scale-100 desktop:opacity-100",
  "starting-style:translate-y-full tablet:starting-style:translate-none tablet:starting-style:scale-[0.96] tablet:starting-style:opacity-0 desktop:starting-style:translate-none desktop:starting-style:scale-[0.96] desktop:starting-style:opacity-0",
  "ending-style:translate-y-full tablet:ending-style:translate-none tablet:ending-style:scale-[0.96] tablet:ending-style:opacity-0 desktop:ending-style:translate-none desktop:ending-style:scale-[0.96] desktop:ending-style:opacity-0",
  "motion-reduce:transition-opacity",
);

/**
 * The overlay: the page behind dims, and the popup opens over it. From tablet up, a dialog in the middle of the page; on phone, a sheet
 * rising from the bottom, with a grab handle on top, padded for the bottom safe area. Focus stays inside until it closes; Escape or a
 * press on the dimmed page closes it. Every prop of Base UI’s `Dialog.Popup`, `className` included: a string, or a function of its state.
 */
export function Popup({
  className,
  children,
  ...props
}: ComponentProps<typeof BaseDialog.Popup>) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop
        className={cn(
          "fixed inset-0 z-50 bg-primary/30 opacity-100 transition-opacity duration-m ease-soft",
          "",
          "",
          "",
          "starting-style:opacity-0",
          "ending-style:opacity-0",
        )}
      />
      <BaseDialog.Popup {...props} className={stateClassName(popup, className)}>
        <span
          aria-hidden="true"
          className={cn(
            "mx-auto mb-xs h-xs w-[2.25rem] shrink-0 rounded-full bg-divider",
            "block",
            "tablet:hidden",
            "desktop:hidden",
          )}
        />
        {children}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}

/** The top row: the title, then the close button at its right end. */
export function Header({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn("flex items-center justify-between gap-s", className)}
    />
  );
}

/** Names the dialog, as a question when it asks for a confirmation: “Make Nordic Wind AG manual?”. An `<h2>`, and the dialog’s accessible name. */
export function Title({
  className,
  ...props
}: ComponentProps<typeof BaseDialog.Title>) {
  return (
    <BaseDialog.Title
      {...props}
      className={stateClassName("text-l font-semibold text-primary", className)}
    />
  );
}

/** One or two sentences under the title: what happens next. A `<p>`, and the dialog’s accessible description. */
export function Description({
  className,
  ...props
}: ComponentProps<typeof BaseDialog.Description>) {
  return (
    <BaseDialog.Description
      {...props}
      className={stateClassName("text-s text-secondary", className)}
    />
  );
}

/**
 * The buttons, the main one last. From tablet up, a row at the bottom right; on phone, a full-width stack with the main
 * button on top.
 */
export function Footer({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "flex gap-s",
        "flex-col-reverse justify-start",
        "tablet:flex-row tablet:justify-end",
        "desktop:flex-row desktop:justify-end",
        className,
      )}
    />
  );
}

/**
 * The close button’s own props, then every prop of Base UI’s `Dialog.Close` but `children` and `render`: it draws its own icon
 * button. `className` is a string, or a function of its state, and wins over the icon button’s classes.
 */
export type CloseProps = {
  /** The button’s icon, any Phosphor icon. A cross by default. */
  icon?: IconProps["icon"] | undefined;
} & Omit<
  ComponentProps<typeof BaseDialog.Close>,
  "icon" | "children" | "render"
>;

/** The icon button at the end of the header, a cross by default, named “Close” for screen readers. */
export function Close({ icon = XIcon, ...props }: CloseProps) {
  const { t } = useTranslation();

  return (
    <BaseDialog.Close
      {...props}
      render={<IconButton icon={icon} label={t("dialog.close")} />}
    />
  );
}

/**
 * The cancel button’s own props, then every prop of Base UI’s `Dialog.Close` but `render`: it draws a secondary button.
 * `className` is a string, or a function of its state, and wins over the button’s classes.
 */
export type CancelProps = {
  /** The button’s label. Defaults to “Cancel”. */
  children?: ReactNode;
} & Omit<ComponentProps<typeof BaseDialog.Close>, "children" | "render">;

/** A secondary button in the footer that closes the dialog without acting. */
export function Cancel({ children, ...props }: CancelProps) {
  const { t } = useTranslation();

  return (
    <BaseDialog.Close {...props} render={<Button intent="secondary" />}>
      {children ?? t("dialog.cancel")}
    </BaseDialog.Close>
  );
}
