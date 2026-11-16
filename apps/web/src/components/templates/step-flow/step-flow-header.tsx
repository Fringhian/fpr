import { useRender } from "@base-ui/react/use-render";
import { CaretLeftIcon } from "@phosphor-icons/react/CaretLeft";
import { XIcon } from "@phosphor-icons/react/X";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { backLink } from "../../../lib/back-link";
import { cn, stateClassName } from "../../../lib/cn";
import {
  StepProgress,
  type StepProgressProps,
} from "../../atoms/step-progress/step-progress";
import { Icon, type IconProps } from "../../foundations/icon/icon";

/**
 * The column's top row, under the top safe area: `Back` on the left, and on
 * the right `Close` or a language switch. It keeps its height when empty.
 */
export function Header({ className, ...props }: ComponentProps<"header">) {
  return (
    <header
      {...props}
      className={cn(
        "flex items-center justify-between gap-s",
        "min-h-[calc(3.5rem+var(--safe-top))] pt-(--safe-top)",
        "tablet:min-h-[calc(4.5rem+var(--safe-top))] tablet:pt-[calc(1.75rem+var(--safe-top))]",
        "desktop:min-h-[calc(4.5rem+var(--safe-top))] desktop:pt-[calc(1.75rem+var(--safe-top))]",
        className,
      )}
    />
  );
}

export type BackProps = {
  /** The icon leading the link, any Phosphor icon. A caret pointing left by default. */
  icon?: IconProps["icon"] | undefined;
} & Omit<useRender.ComponentProps<"a">, "icon">;

/**
 * Back to the previous step, top left: the caret, then “Back”, or the
 * `children` given. Renders an `<a>`; `render` composes it with the router's
 * link, or draws a button: `render={<button type="button" />}`.
 */
export function Back({
  render,
  ref,
  icon = CaretLeftIcon,
  className,
  children,
  ...props
}: BackProps) {
  const { t } = useTranslation();

  return useRender({
    render,
    ref,
    defaultTagName: "a",
    props: {
      ...props,
      className: cn(backLink, className),
      children: (
        <>
          <Icon icon={icon} size="m" />
          {children ?? t("stepFlow.back")}
        </>
      ),
    },
  });
}

export type CloseProps = {
  /** The icon leading the label, any Phosphor icon. A cross by default. */
  icon?: IconProps["icon"] | undefined;
} & Omit<useRender.ComponentProps<"a">, "icon">;

/**
 * Leaves the flow for the page it opened from, top right, in grey: the cross
 * alone on phone, then “Close”, or the `children` given, from tablet up.
 * Screen readers hear the label at every width. Renders an `<a>`; `render`
 * composes it with the router's link, or draws a button that asks first when
 * the step holds unsaved input.
 */
export function Close({
  render,
  ref,
  icon = XIcon,
  className,
  children,
  ...props
}: CloseProps) {
  const { t } = useTranslation();

  return useRender({
    render,
    ref,
    defaultTagName: "a",
    props: {
      ...props,
      className: cn(
        backLink,
        "ms-auto justify-end text-secondary",
        "",
        "",
        "",
        "hover:text-primary",
        className,
      ),
      children: (
        <>
          <Icon icon={icon} size="m" />
          <span
            className={cn(
              "",
              "sr-only",
              "tablet:not-sr-only",
              "desktop:not-sr-only",
            )}
          >
            {children ?? t("stepFlow.close")}
          </span>
        </>
      ),
    },
  });
}

/** The flow's progress under the header, across the column: one segment per step, filled up to this one. */
export function Progress({ className, ...props }: StepProgressProps) {
  return (
    <StepProgress
      {...props}
      className={stateClassName(
        cn("", "mt-xs", "tablet:mt-[0.875rem]", "desktop:mt-[0.875rem]"),
        className,
      )}
    />
  );
}
