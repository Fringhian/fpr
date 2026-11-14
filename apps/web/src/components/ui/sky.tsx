import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

/**
 * The page ground: warm snow, and the stacking context the sky band sits
 * behind. A page without a header sentence renders it without a `Band`.
 */
export function Root({ className, ...props }: ComponentProps<"div">) {
  return (
    <div {...props} className={cn("relative isolate bg-page", className)} />
  );
}

/**
 * The peach sky behind the top of the page, closed by the ridge at the fixed
 * horizon: the ridge's top sits 206px from the page top on phone, 200px from
 * tablet up. Goes inside `Root`, which it fills across.
 */
export function Band({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      aria-hidden
      className={cn(
        "absolute inset-x-[0] top-[0] -z-10 bg-sky",
        "pt-[12.875rem]",
        "tablet:pt-[12.5rem]",
        "desktop:pt-[12.5rem]",
        className,
      )}
    >
      <Ridge />
    </div>
  );
}

/**
 * The ridge: one 600 × 64 tile repeated across, never stretched, 52px high on
 * phone and 64px from tablet up. The far ridge is lilac, the near one snow;
 * above them it is transparent, so it shows whatever it is laid on.
 */
export function Ridge({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      aria-hidden
      className={cn(
        "grid",
        "h-[3.25rem]",
        "tablet:h-[4rem]",
        "desktop:h-[4rem]",
        className,
      )}
    >
      <div className="col-start-1 row-start-1 bg-ridge mask-(--ridge-far) mask-size-[auto_100%] mask-repeat-x" />
      <div className="col-start-1 row-start-1 bg-page mask-(--ridge-near) mask-size-[auto_100%] mask-repeat-x" />
    </div>
  );
}
