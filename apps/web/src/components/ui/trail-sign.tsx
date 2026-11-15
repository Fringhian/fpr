import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface TrailSignOwnProps {
  /** What the sign says: “Sam leads”, “You +4.2%”, “€12,374”. */
  children: ReactNode;
  /** The person's picture, at 20 px, before the words. */
  picture?: ReactNode;
}

export type TrailSignProps = TrailSignOwnProps &
  Omit<ComponentProps<"span">, keyof TrailSignOwnProps>;

/**
 * The signature: a white capsule with a charcoal outline that names the
 * leader and you, in sentences and at the end of your lines in the race. At
 * most two signs on a chart: the focused member and you. Every other prop
 * goes to the `<span>`, `className` included.
 */
export function TrailSign({
  children,
  picture,
  className,
  ...props
}: TrailSignProps) {
  const start = picture ? "pl-[0.1875rem]" : "pl-[0.75rem]";

  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center gap-[0.375rem] rounded-full bg-surface py-[0.1875rem] pr-[0.75rem] text-s font-semibold whitespace-nowrap text-primary shadow-[0_0_0_1.5px_var(--color-primary)]",
        start,
        className,
      )}
    >
      {picture}
      {children}
    </span>
  );
}
