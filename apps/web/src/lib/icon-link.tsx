import { useRender } from "@base-ui/react/use-render";
import { Icon, type IconProps } from "../components/foundations/icon/icon";
import { cn } from "./cn";

export type IconLinkProps = {
  /** The icon leading the link, any Phosphor icon. Each link has its own by default. */
  icon?: IconProps["icon"] | undefined;
} & Omit<useRender.ComponentProps<"a">, "icon">;

/**
 * A way back or out of a page, its icon then its text: the page bar's back
 * link, and a step flow's Back and Close. At least 44px square, so a thumb
 * finds it, and underlined on hover. Renders an `<a>`; `render` composes it
 * with the router's link, or draws a button: `render={<button type="button" />}`.
 */
export function IconLink({
  render,
  ref,
  icon,
  className,
  children,
  ...props
}: IconLinkProps) {
  return useRender({
    render,
    ref,
    defaultTagName: "a",
    props: {
      ...props,
      className: cn(
        "inline-flex min-h-[2.75rem] min-w-[2.75rem] shrink-0 items-center gap-xs rounded-s text-m font-semibold text-primary no-underline underline-offset-[0.2em]",
        "",
        "",
        "",
        "hover:underline",
        "focus-visible:focus-ring",
        className,
      ),
      children: (
        <>
          {icon ? <Icon icon={icon} size="m" /> : null}
          {children}
        </>
      ),
    },
  });
}
