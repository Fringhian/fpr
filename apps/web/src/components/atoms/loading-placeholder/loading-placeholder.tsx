import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";

/**
 * Holds the place of content still loading, such as a holding's curve before
 * its prices arrive: a dashed outline with a short line saying what loads,
 * “Loading its prices…”, or “Loading…” without one. Its ground pulses gently,
 * and stays still for a reader who asks for reduced motion. It fills the width
 * it is given; a `className` sets its height.
 */
export function LoadingPlaceholder({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  const { t } = useTranslation();

  const line = children ?? t("smallParts.loadingPlaceholder.default");

  return (
    <div
      role="status"
      {...props}
      className={cn(
        "relative isolate flex min-h-[2.125rem] items-center justify-center rounded-s border-[0.09375rem] border-dashed border-divider px-m py-xs text-center text-xs text-secondary",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 -z-10 rounded-[inherit] bg-highlight",
          "",
          "",
          "",
          "animate-pulse motion-reduce:animate-none",
        )}
      />
      {line}
    </div>
  );
}
