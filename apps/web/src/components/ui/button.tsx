import { Button as BaseButton } from "@base-ui/react/button";
import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import { Icon, type IconProps } from "./icon";

const button = cva(
  [
    "relative inline-grid cursor-pointer place-items-center rounded-full font-semibold whitespace-nowrap",
    "",
    "",
    "",
    "focus-visible:focus-ring",
    "disabled:not-aria-busy:cursor-not-allowed disabled:not-aria-busy:opacity-[0.45]",
    "aria-busy:cursor-progress",
  ],
  {
    variants: {
      intent: {
        primary: [
          "bg-primary text-on-primary",
          "",
          "",
          "",
          "not-disabled:hover:bg-primary/90",
        ],
        secondary: [
          "bg-surface text-primary shadow-outline",
          "",
          "",
          "",
          "not-disabled:hover:bg-highlight",
        ],
        danger: [
          "bg-surface text-error shadow-outline",
          "",
          "",
          "",
          "not-disabled:hover:bg-highlight",
        ],
      },
      size: {
        s: "min-h-[2rem] px-[0.75rem] text-s",
        m: "min-h-xl px-[1.125rem] text-s",
        wide: "min-h-[3rem] w-full px-[1.125rem] text-s",
        step: [
          "min-h-[3.5rem] text-m",
          "w-full px-[3.5rem]",
          "tablet:w-auto tablet:px-l",
          "desktop:w-auto desktop:px-l",
        ],
      },
      next: { true: "", false: "" },
    },
    compoundVariants: [
      {
        size: "step",
        next: true,
        className: ["", "", "tablet:pr-[3.25rem]", "desktop:pr-[3.25rem]"],
      },
    ],
    defaultVariants: { intent: "secondary", size: "m", next: false },
  },
);

/** Both of the button's faces share one grid cell, so it keeps its width while loading. */
const face = "col-start-1 row-start-1 inline-flex items-center gap-s";

export interface ButtonOwnProps {
  /** `primary` (charcoal), the one main action of a screen region; `secondary` (white, outlined); `danger` (red text) to delete or sign out. */
  intent?: "primary" | "secondary" | "danger";
  /** `s` 32px; `m` 40px; `wide` 48px at full width; `step` 56px, the main button of a step flow: full width on phone, fitted to its label on tablet and desktop. */
  size?: "s" | "m" | "wide" | "step";
  /** An icon leading the label, any Phosphor icon: `icon={PlusIcon}`. */
  icon?: IconProps["icon"] | undefined;
  /** With `size="step"`, draws `nextIcon` at its right end: another step follows. The flow’s last button has none. */
  next?: boolean;
  /** The icon `next` draws. An arrow by default. */
  nextIcon?: IconProps["icon"];
  /**
   * Shows a spinner and the loading label in place of the label. The button stays focusable and ignores presses.
   * Pass it, `false` included, to any button that can load: the button then keeps one width, the wider of its label and its loading label, in both states.
   */
  loading?: boolean;
  /** The text shown while loading. Defaults to “Saving…”. */
  loadingLabel?: string;
}

export type ButtonProps = ButtonOwnProps &
  Omit<
    ComponentProps<typeof BaseButton>,
    keyof ButtonOwnProps | "focusableWhenDisabled"
  >;

/**
 * A capsule button on Base UI’s button. It names its action: “Save change”,
 * never a bare “Continue”. Every other prop goes to Base UI’s button,
 * `className` included: a string, or a function of the button’s state.
 */
export function Button({
  intent = "secondary",
  size = "m",
  icon,
  next = false,
  nextIcon = ArrowRightIcon,
  loading,
  loadingLabel,
  disabled = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const { t } = useTranslation();

  const busy = loading === true;
  const arrow = size === "step" && next;
  const classes = button({ intent, size, next: arrow });

  return (
    <BaseButton
      {...props}
      disabled={disabled || busy}
      focusableWhenDisabled={busy}
      aria-busy={busy || undefined}
      className={(state) =>
        cn(
          classes,
          typeof className === "function" ? className(state) : className,
        )
      }
    >
      <span className={cn(face, busy ? "invisible" : "")}>
        {icon ? <Icon icon={icon} size="s" /> : null}
        {children}
      </span>
      {loading === undefined ? null : (
        <span className={cn(face, busy ? "" : "invisible")}>
          <span
            aria-hidden="true"
            className={cn(
              "size-[0.875rem] animate-spin rounded-full border-2 border-current/35 border-t-current",
              "",
              "",
              "",
              "motion-reduce:animate-none",
            )}
          />
          {loadingLabel ?? t("button.saving")}
        </span>
      )}
      {arrow && !busy ? (
        <Icon
          icon={nextIcon}
          size="s"
          className="absolute top-1/2 right-[1.25rem] -translate-y-1/2"
        />
      ) : null}
    </BaseButton>
  );
}
