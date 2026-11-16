import { cn } from "./cn";

/**
 * The look of a way back or out of a page, an icon then its text: the page
 * bar's back link, and a step flow's Back and Close. At least 44px square, so
 * a thumb finds it, and underlined on hover.
 */
export const backLink = cn(
  "inline-flex min-h-[2.75rem] min-w-[2.75rem] shrink-0 items-center gap-xs rounded-s text-m font-semibold text-primary no-underline underline-offset-[0.2em]",
  "",
  "",
  "",
  "hover:underline",
  "focus-visible:focus-ring",
);
