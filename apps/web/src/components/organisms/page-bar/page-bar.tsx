import { useRender } from "@base-ui/react/use-render";
import { CaretLeftIcon } from "@phosphor-icons/react/CaretLeft";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { Icon, type IconProps } from "../../foundations/icon/icon";

/**
 * The bar at the top of every page: the title or the back link on the left,
 * the period control on the right, and nothing else. On a page with a header
 * sentence it is the first thing in `Sky.Header`, on the sky; on a page
 * without one it starts the page, on snow. The page's gutters frame it. On
 * phone, `Navigation.TopBar` is this bar with the account menu at its right end.
 */
export function Root({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "flex shrink-0 items-center gap-s",
        "h-[4.375rem]",
        "tablet:h-[5rem]",
        "desktop:h-[5rem]",
        className,
      )}
    />
  );
}

/**
 * The page's name, on the left: “Home”. A `<p>`, since the header sentence
 * holds the page's heading; a page without one renders it as its heading:
 * `render={(props) => <h1 {...props} />}`.
 */
export function Title({
  render,
  ref,
  className,
  ...props
}: useRender.ComponentProps<"p">) {
  return useRender({
    render,
    ref,
    defaultTagName: "p",
    props: {
      ...props,
      className: cn(
        "min-w-0 truncate text-l font-semibold text-primary",
        className,
      ),
    },
  });
}

interface BackOwnProps {
  /** The icon leading the link, any Phosphor icon. A caret pointing left by default. */
  icon?: IconProps["icon"] | undefined;
}

export type BackProps = BackOwnProps &
  Omit<useRender.ComponentProps<"a">, keyof BackOwnProps>;

/**
 * The back link, on the left in place of the title: the caret, then the
 * parent page's name, “Members”. Screen readers hear “Back to Members”.
 * Renders an `<a>`; `render` composes it with the router's link:
 * `render={<Link to="/members" />}`.
 */
export function Back({
  render,
  ref,
  icon = CaretLeftIcon,
  className,
  children,
  ...props
}: BackProps) {
  const { t } = useTranslation();

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
          <Icon icon={icon} size="m" />
          <span className="sr-only">{t("pageBar.back")}</span> {children}
        </>
      ),
    },
  });
}

/**
 * The page's name after `Back`, from tablet up, after a slash:
 * “Members / Sam”. The phone shows the back link alone: the header sentence
 * names the page.
 */
export function Current({
  className,
  children,
  ...props
}: ComponentProps<"p">) {
  return (
    <p
      {...props}
      className={cn(
        "min-w-0 items-center gap-s text-m font-semibold text-primary",
        "hidden",
        "tablet:flex",
        "desktop:flex",
        className,
      )}
    >
      <span aria-hidden className="font-normal text-secondary">
        /
      </span>
      <span className="truncate">{children}</span>
    </p>
  );
}

/**
 * The right end of the bar: the period control, on every page that shows
 * the period. A page without it, like People, leaves it out.
 */
export function Controls({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn("ms-auto flex shrink-0 items-center gap-s", className)}
    />
  );
}
