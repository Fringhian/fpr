import type { ComponentProps } from "react";
import { cn } from "../../../lib/cn";

/**
 * The header sentence's block: the greeting, the headline, then the story
 * line. It goes in `Sky.Header`, after the page bar. Every prop goes to the
 * `<div>`.
 */
export function Root(props: ComponentProps<"div">) {
  return <div {...props} />;
}

/** The greeting, in the sky's ink: “Good evening, Alex”. Every prop goes to the `<p>`, `className` included. */
export function Greeting({ className, ...props }: ComponentProps<"p">) {
  return <p {...props} className={cn("text-m text-on-sky", className)} />;
}

/**
 * The headline, the page's heading: display size on tablet and desktop,
 * headline size on phone. Every prop goes to the `<h1>`, `className`
 * included.
 */
export function Headline({ className, ...props }: ComponentProps<"h1">) {
  return (
    <h1
      {...props}
      className={cn(
        "mt-xs font-semibold text-balance text-primary",
        "text-xl",
        "tablet:text-display",
        "desktop:text-display",
        className,
      )}
    />
  );
}

/**
 * The story line, with room for trail signs and chips: its lines are 1.8
 * times its text apart, so signs on two lines never touch. Every prop goes to
 * the `<p>`, `className` included.
 */
export function Story({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      {...props}
      className={cn("mt-s text-m leading-[1.8] text-primary", className)}
    />
  );
}

/**
 * A part of the story line shown from tablet up: the phone keeps the leader
 * only. Every prop goes to the `<span>`, `className` included.
 */
export function Wide({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      {...props}
      className={cn("", "hidden", "tablet:inline", "desktop:inline", className)}
    />
  );
}
