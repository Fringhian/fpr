import { useRender } from "@base-ui/react/use-render";
import { cva } from "class-variance-authority";
import type { Ref } from "react";
import { cn } from "../../../lib/cn";

const card = cva("rounded-l bg-surface", {
  variants: {
    elevation: { outline: "shadow-outline", rest: "shadow-rest" },
  },
  defaultVariants: { elevation: "outline" },
});

/** Every prop of a `<div>`, and Base UI's `render` to draw the card as another element, such as `<article />` or `<section />`. */
export type CardProps = {
  /** `outline` (the default), a card resting on the page with its divider line; `rest`, lifted by a soft shadow, as the first card under the sky. */
  elevation?: "outline" | "rest" | undefined;
  /** The element the card renders, whichever `render` draws. */
  ref?: Ref<HTMLElement> | undefined;
} & Omit<useRender.ComponentProps<"div">, "elevation" | "ref">;

/**
 * A white card with large rounded corners: the ground of a holding, the
 * standings or the focus panel. Its padding and layout come from the caller's
 * `className`. Renders a `<div>`; `render` draws it as another element.
 */
export function Card({
  elevation,
  render,
  ref,
  className,
  ...props
}: CardProps) {
  return useRender({
    render,
    ref,
    defaultTagName: "div",
    props: { ...props, className: cn(card({ elevation }), className) },
  });
}
