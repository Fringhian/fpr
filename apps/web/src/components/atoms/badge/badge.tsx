import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";

/** A grey outline: a plain fact. */
const NEUTRAL =
  "bg-surface text-secondary shadow-[inset_0_0_0_1.5px_var(--color-divider)]";
/** A green outline: something works. */
const SUCCESS =
  "bg-surface text-success shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--color-success)_27%,var(--color-surface))]";
/** A red outline: something needs attention. */
const WARNING =
  "bg-surface text-warning shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--color-warning)_27%,var(--color-surface))]";
/** A soft fill, no outline: a past fact. */
const SOFT = "bg-highlight text-on-sky";

const badge = cva(
  "inline-flex items-center rounded-full px-[0.5625rem] py-[0.0625rem] text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      state: {
        manual: NEUTRAL,
        pricePending: WARNING,
        active: SUCCESS,
        waitingForFirstUse: NEUTRAL,
        revoked: WARNING,
        ended: WARNING,
        expired: WARNING,
        heldBefore: SOFT,
        saved: SUCCESS,
      },
    },
  },
);

/**
 * The states a badge names: a share entered by hand, a share whose prices
 * haven't arrived, an access link in use, not opened yet, or revoked, access
 * past its end date, a link never used before its deadline, a share held in
 * the past, a change just saved.
 */
export type BadgeState =
  | "manual"
  | "pricePending"
  | "active"
  | "waitingForFirstUse"
  | "revoked"
  | "ended"
  | "expired"
  | "heldBefore"
  | "saved";

export interface BadgeOwnProps {
  /** The state the badge names. Its words and colour follow from it. */
  state: BadgeState;
}

/** The badge writes its own words, so it takes no `children`. */
export type BadgeProps = BadgeOwnProps &
  Omit<ComponentProps<"span">, keyof BadgeOwnProps | "children">;

/**
 * A small capsule label for a state, its words in the reader's language.
 * Every other prop goes to the `<span>`, `className` included.
 */
export function Badge({ state, className, ...props }: BadgeProps) {
  const { t } = useTranslation();

  return (
    <span {...props} className={cn(badge({ state }), className)}>
      {t(`badge.${state}`)}
    </span>
  );
}
