import { useRender } from "@base-ui/react/use-render";
import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import { cn } from "../../lib/cn";
import { Icon } from "./icon";

export interface TextLinkProps extends useRender.ComponentProps<"a"> {
  /** Ends the link with a caret: it goes to another page. */
  caret?: boolean;
}

/**
 * A link in the link colour, underlined so it never rests on colour alone. It
 * takes the size of its text, and wraps inside a sentence. Renders an `<a>`;
 * `render` composes it with the router's link: `render={<Link to="/help" />}`.
 */
export function TextLink({
  render,
  ref,
  caret = false,
  className,
  children,
  ...props
}: TextLinkProps) {
  return useRender({
    render,
    ref,
    defaultTagName: "a",
    props: {
      ...props,
      className: cn(
        "font-semibold text-link underline decoration-[0.0625rem] underline-offset-[0.2em]",
        "",
        "",
        "",
        "hover:decoration-[0.125rem]",
        "focus-visible:focus-ring",
        className,
      ),
      children: (
        <>
          {children}
          {caret ? (
            <Icon
              icon={CaretRightIcon}
              size="s"
              className="ms-xs inline align-[-0.1875em]"
            />
          ) : null}
        </>
      ),
    },
  });
}
