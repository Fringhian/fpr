import { useRender } from "@base-ui/react/use-render";
import { type ComponentProps, useRef } from "react";
import { cn } from "../../../lib/cn";
import { Button, type ButtonProps } from "../../atoms/button/button";
import { useBottomScrollRoom } from "./use-bottom-scroll-room";

/**
 * The step itself, under the progress: the caption, the question, then what
 * answers it. It fills the column's height on phone and desktop, so the
 * main button sits at the bottom; on tablet the button follows it.
 */
export function Body({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "flex min-w-0 flex-col",
        "flex-1 gap-[0.75rem] pt-[0.875rem]",
        "tablet:flex-none tablet:gap-m tablet:pt-[1.75rem]",
        "desktop:flex-1 desktop:gap-m desktop:pt-[1.75rem]",
        className,
      )}
    />
  );
}

/** What the flow knows so far, above the question, in grey: “Bought · World Index ETF”. */
export function Caption({ className, ...props }: ComponentProps<"p">) {
  return <p {...props} className={cn("text-s text-secondary", className)} />;
}

/** The step's one question, the page's heading: “How many did you buy?”. */
export function Question({ className, ...props }: ComponentProps<"h1">) {
  return (
    <h1
      {...props}
      className={cn(
        "font-semibold text-balance",
        "text-xl",
        "tablet:text-display",
        "desktop:text-display",
        className,
      )}
    />
  );
}

/** One sentence under the question, in grey: what the step is for. */
export function Description({ className, ...props }: ComponentProps<"p">) {
  return <p {...props} className={cn("text-m text-secondary", className)} />;
}

/**
 * The step's buttons, kept in view at the bottom while the step scrolls: the
 * main button first. On phone they stack at full width, the main button on
 * top; from tablet up they sit bottom right, fitted to their labels, the main
 * button at the right end. The page's scroll padding keeps their height, so a
 * focused field never sits under them.
 */
export function Actions({ ref, className, ...props }: ComponentProps<"div">) {
  const bar = useRef<HTMLDivElement>(null);
  useBottomScrollRoom(bar);

  return useRender({
    ref: [ref ?? null, bar],
    defaultTagName: "div",
    props: {
      ...props,
      className: cn(
        // The snow fades in over its top 12px, so content scrolling under it
        // fades out, and the outline of a card ending above it still shows.
        "sticky bottom-0 z-10 flex gap-s bg-linear-to-b from-transparent to-page to-[0.75rem]",
        "flex-col pt-[0.75rem] pb-[calc(1.125rem+env(safe-area-inset-bottom,0px))]",
        "tablet:flex-row-reverse tablet:pt-[1.75rem] tablet:pb-[calc(2.25rem+env(safe-area-inset-bottom,0px))]",
        "desktop:flex-row-reverse desktop:pt-[1.25rem] desktop:pb-[2rem]",
        className,
      ),
    },
  });
}

/** Every prop of `Button` but its intent and size, which the main button fixes. */
export type MainButtonProps = Omit<ButtonProps, "intent" | "size">;

/**
 * The step's main button, 56px tall, in charcoal, named after what comes
 * next: “Enter how many”. `next` ends it with an arrow while another step
 * follows; the flow's last button, “Save change”, has none.
 */
export function MainButton(props: MainButtonProps) {
  return <Button {...props} intent="primary" size="step" />;
}
