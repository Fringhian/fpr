import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { XIcon } from "@phosphor-icons/react/X";
import type { ComponentProps, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import { Button } from "./button";
import { IconButton } from "./icon-button";

/** Any part's props: Base UI's, with `className` a plain string. */
type PartProps<Part extends "Popup" | "Title" | "Description" | "Close"> = Omit<
  ComponentProps<(typeof BaseDialog)[Part]>,
  "className"
> & {
  /** Classes added to the part’s own, which win any conflict. */
  className?: string;
};

/**
 * Holds the dialog’s state, open or closed. Base UI’s `Dialog.Root`: `open` and `onOpenChange` to control it, `defaultOpen` to start open.
 * One dialog is open at a time: a dialog never opens another, it changes its own content.
 */
export const Root = BaseDialog.Root;

/** Opens the dialog. Base UI’s `Dialog.Trigger`: pass `render={<Button />}` to open it from a button. Focus returns here when the dialog closes. */
export const Trigger = BaseDialog.Trigger;

export type PopupProps = PartProps<"Popup">;

/**
 * The overlay: the page behind dims, and the popup opens over it. From tablet up, a dialog in the middle of the page; on phone, a sheet
 * rising from the bottom, with a grab handle on top, padded for the bottom safe area. Focus stays inside until it closes; Escape or a
 * press on the dimmed page closes it.
 */
export function Popup({ className, children, ...props }: PopupProps) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop
        className={cn(
          "fixed inset-[0] bg-primary/30 opacity-100 transition-opacity duration-200 ease-out",
          "",
          "",
          "",
          "starting-style:opacity-0",
          "ending-style:opacity-0",
        )}
      />
      <BaseDialog.Popup
        {...props}
        className={cn(
          "fixed flex flex-col overflow-y-auto overscroll-contain bg-surface font-sans text-primary shadow-float outline-none transition-[translate,scale,opacity] duration-200 ease-out",
          "inset-x-[0] top-auto bottom-[0] m-[0] h-auto max-h-[calc(100dvh-2.5rem)] w-auto gap-[0.75rem] rounded-t-xl rounded-b-none px-[1.125rem] pt-[0.625rem] pb-[calc(1.375rem+env(safe-area-inset-bottom))] translate-none scale-100 opacity-100",
          "tablet:inset-[0] tablet:m-auto tablet:h-fit tablet:max-h-[calc(100dvh-5rem)] tablet:w-[min(30rem,calc(100vw-3rem))] tablet:gap-[0.875rem] tablet:rounded-xl tablet:p-[1.375rem] tablet:translate-none tablet:scale-100 tablet:opacity-100",
          "desktop:inset-[0] desktop:m-auto desktop:h-fit desktop:max-h-[calc(100dvh-5rem)] desktop:w-[min(30rem,calc(100vw-3rem))] desktop:gap-[0.875rem] desktop:rounded-xl desktop:p-[1.375rem] desktop:translate-none desktop:scale-100 desktop:opacity-100",
          "starting-style:translate-y-full tablet:starting-style:translate-none tablet:starting-style:scale-[0.96] tablet:starting-style:opacity-0 desktop:starting-style:translate-none desktop:starting-style:scale-[0.96] desktop:starting-style:opacity-0",
          "ending-style:translate-y-full tablet:ending-style:translate-none tablet:ending-style:scale-[0.96] tablet:ending-style:opacity-0 desktop:ending-style:translate-none desktop:ending-style:scale-[0.96] desktop:ending-style:opacity-0",
          "motion-reduce:transition-opacity",
          className,
        )}
      >
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

export interface HeaderProps extends ComponentProps<"div"> {
  /** Classes added to the part’s own, which win any conflict. */
  className?: string;
}

/** The top row: the title, then the close button at its right end. */
export function Header({ className, ...props }: HeaderProps) {
  return (
    <div
      {...props}
      className={cn("flex items-center justify-between gap-s", className)}
    />
  );
}

export type TitleProps = PartProps<"Title">;

/** Names the dialog, as a question when it asks for a confirmation: “Make Nordic Wind AG manual?”. An `<h2>`, and the dialog’s accessible name. */
export function Title({ className, ...props }: TitleProps) {
  return (
    <BaseDialog.Title
      {...props}
      className={cn("text-l font-semibold text-primary", className)}
    />
  );
}

export type DescriptionProps = PartProps<"Description">;

/** One or two sentences under the title: what happens next. A `<p>`, and the dialog’s accessible description. */
export function Description({ className, ...props }: DescriptionProps) {
  return (
    <BaseDialog.Description
      {...props}
      className={cn("text-s text-secondary", className)}
    />
  );
}

export interface FooterProps extends ComponentProps<"div"> {
  /** Classes added to the part’s own, which win any conflict. */
  className?: string;
}

/**
 * The buttons, the main one last. From tablet up, a row at the bottom right; on phone, a full-width stack with the main
 * button on top.
 */
export function Footer({ className, ...props }: FooterProps) {
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

export type CloseProps = Omit<PartProps<"Close">, "children" | "render">;

/** The ✕ button at the end of the header, named “Close” for screen readers. */
export function Close({ className, ...props }: CloseProps) {
  const { t } = useTranslation();
  return (
    <BaseDialog.Close
      {...props}
      render={
        <IconButton
          icon={XIcon}
          label={t("dialog.close")}
          className={cn(className)}
        />
      }
    />
  );
}

export interface CancelProps
  extends Omit<PartProps<"Close">, "children" | "render"> {
  /** The button’s label. Defaults to “Cancel”. */
  children?: ReactNode;
}

/** A secondary button in the footer that closes the dialog without acting. */
export function Cancel({ className, children, ...props }: CancelProps) {
  const { t } = useTranslation();
  return (
    <BaseDialog.Close
      {...props}
      render={<Button intent="secondary" className={cn(className)} />}
    >
      {children ?? t("dialog.cancel")}
    </BaseDialog.Close>
  );
}
