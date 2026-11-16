import { CaretLeftIcon } from "@phosphor-icons/react/CaretLeft";
import { XIcon } from "@phosphor-icons/react/X";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn, stateClassName } from "../../../lib/cn";
import { IconLink, type IconLinkProps } from "../../../lib/icon-link";
import {
  StepProgress,
  type StepProgressProps,
} from "../../atoms/step-progress/step-progress";

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

/**
 * Back to the previous step, top left: `icon`, a caret pointing left by
 * default, then “Back”, or the `children` given. Renders an `<a>`; `render`
 * composes it with the router's link, or draws a button:
 * `render={<button type="button" />}`.
 */
export function Back({
  icon = CaretLeftIcon,
  children,
  ...props
}: IconLinkProps) {
  const { t } = useTranslation();

  return (
    <IconLink {...props} icon={icon}>
      {children ?? t("stepFlow.back")}
    </IconLink>
  );
}

/**
 * Leaves the flow for the page it opened from, top right, in grey: `icon`, a
 * cross by default, alone on phone, then “Close”, or the `children` given,
 * from tablet up. Screen readers hear the label at every width. Renders an
 * `<a>`; `render` composes it with the router's link, or draws a button that
 * asks first when the step holds unsaved input.
 */
export function Close({
  icon = XIcon,
  className,
  children,
  ...props
}: IconLinkProps) {
  const { t } = useTranslation();

  return (
    <IconLink
      {...props}
      icon={icon}
      className={cn(
        "ms-auto justify-end text-secondary",
        "",
        "",
        "",
        "hover:text-primary",
        className,
      )}
    >
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
    </IconLink>
  );
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
