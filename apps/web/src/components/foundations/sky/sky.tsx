import type { ComponentProps } from "react";
import { cn } from "../../../lib/cn";

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
 * horizon: the ridge's top sits 206px below the top safe area on phone, 200px
 * from tablet up. Goes inside `Root`, which it fills across.
 */
export function Band({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      aria-hidden
      className={cn(
        "absolute inset-x-[0] top-[0] -z-10 bg-sky",
        "pt-[calc(12.875rem+var(--safe-top))]",
        "tablet:pt-[calc(12.5rem+var(--safe-top))]",
        "desktop:pt-[calc(12.5rem+var(--safe-top))]",
        className,
      )}
    >
      <Ridge />
    </div>
  );
}

/**
 * The header sentence's place, over the sky. The page's content starts right
 * under it, just below the near ridge, so the whole ridge shows above the
 * first card: 240px below the top safe area on phone, 236px from tablet up.
 * Its content flows from its top: the page bar, which pads for the safe area,
 * then the header sentence. Its height is fixed: a header that doesn't fit
 * means the page has no sky, never a moved ridge.
 */
export function Header({ className, ...props }: ComponentProps<"header">) {
  return (
    <header
      {...props}
      className={cn(
        "flex flex-col",
        "h-[calc(15rem+var(--safe-top))] pb-[0.75rem]",
        "tablet:h-[calc(14.75rem+var(--safe-top))] tablet:pb-[1.125rem]",
        "desktop:h-[calc(14.75rem+var(--safe-top))] desktop:pb-[1.125rem]",
        className,
      )}
    />
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
