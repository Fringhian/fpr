import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";

const NEUTRAL = "bg-surface text-secondary inset-shadow-outline";
const SUCCESS =
  "bg-surface text-success inset-shadow-outline inset-shadow-success/27";
const WARNING =
  "bg-surface text-warning inset-shadow-outline inset-shadow-warning/27";
// A soft fill with no outline, for a past fact.
const SOFT = "bg-highlight text-on-sky";

const STATES = {
  manual: NEUTRAL,
  pricePending: WARNING,
  incomplete: WARNING,
  active: SUCCESS,
  waitingForFirstUse: NEUTRAL,
  revoked: WARNING,
  ended: WARNING,
  expired: WARNING,
  heldBefore: SOFT,
  saved: SUCCESS,
};

const badge = cva(
  "inline-flex items-center rounded-full px-[0.5625rem] py-[0.0625rem] text-xs font-semibold whitespace-nowrap",
  { variants: { state: STATES } },
);

/**
 * The states a badge names: a share entered by hand, a share whose prices
 * haven't arrived, a balance that leaves such a share out, an access link in
 * use, not opened yet, or revoked, access past its end date, a link never used
 * before its deadline, a share held in the past, a change just saved.
 */
export type BadgeState = keyof typeof STATES;

export type BadgeProps = {
  /** The state the badge names. Its words and colour follow from it. */
  state: BadgeState;
} & Omit<ComponentProps<"span">, "state" | "children">;

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
