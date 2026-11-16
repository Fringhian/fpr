import { useRender } from "@base-ui/react/use-render";
import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import { cn } from "../../../lib/cn";
import { Icon, type IconProps } from "../../foundations/icon/icon";

/** Every prop of an `<a>`, and Base UI's `render` to compose it with another element. */
export type TextLinkProps = {
  /** Ends the link with `toPageIcon`: it goes to another page. */
  toPage?: boolean;
  /** The icon `toPage` draws, any Phosphor icon. A caret by default. */
  toPageIcon?: IconProps["icon"] | undefined;
} & Omit<useRender.ComponentProps<"a">, "toPage" | "toPageIcon">;

/**
 * A link in the link colour, underlined so it never rests on colour alone. It
 * takes the size of its text, and wraps inside a sentence. Renders an `<a>`;
 * `render` composes it with the router's link: `render={<Link to="/help" />}`.
 */
export function TextLink({
  toPage = false,
  toPageIcon = CaretRightIcon,
  render,
  ref,
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
          {toPage ? (
            <Icon
              icon={toPageIcon}
              size="s"
              className="ms-xs inline align-[-0.1875em]"
            />
          ) : null}
        </>
      ),
    },
  });
}
