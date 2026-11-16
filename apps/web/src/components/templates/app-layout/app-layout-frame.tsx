import type { ComponentProps, MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import * as Sky from "../../foundations/sky/sky";
import * as PageBar from "../../organisms/page-bar/page-bar";

/** The id of the page's `<main>`, which “Skip to content” leads to. */
export const CONTENT_ID = "content";

/**
 * Moves focus to the page's `<main>`. It takes focus only while followed
 * there: a click on its text never moves focus to it.
 */
function skipToContent(event: MouseEvent<HTMLAnchorElement>) {
  const main = event.currentTarget.ownerDocument.getElementById(CONTENT_ID);
  if (main === null) return;
  event.preventDefault();
  main.setAttribute("tabindex", "-1");
  main.addEventListener("blur", () => main.removeAttribute("tabindex"), {
    once: true,
  });
  main.focus();
}

/**
 * “Skip to content”, the first thing on the page: out of view until keyboard
 * focus reaches it, then pinned top left, under the top safe area. Fixed in
 * both states, so focusing it never scrolls the page.
 */
function SkipLink() {
  const { t } = useTranslation();

  return (
    <a
      href={`#${CONTENT_ID}`}
      onClick={skipToContent}
      className={cn(
        "fixed left-s top-[calc(var(--spacing-s)+var(--safe-top))] z-50 rounded-full bg-primary px-m py-[0.625rem] text-s font-semibold text-on-primary no-underline transition-transform duration-s ease-soft -translate-y-[calc(100%+var(--spacing-m)+var(--safe-top))]",
        "",
        "",
        "",
        "focus:translate-y-0",
        "focus-visible:focus-ring",
        "motion-reduce:transition-none",
      )}
    >
      {t("appLayout.skip")}
    </a>
  );
}

/**
 * The frame of every everyday page, inside `Navigation.Root`: “Skip to
 * content” first, then what it holds, side by side: `Navigation.Side`,
 * `Main`, and `Navigation.TabBar`. It pads the left and right safe areas of
 * a phone held sideways.
 */
export function Root({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "flex min-h-dvh bg-page ps-[env(safe-area-inset-left,0px)] pe-[env(safe-area-inset-right,0px)] font-sans text-primary",
        className,
      )}
    >
      <SkipLink />
      {children}
    </div>
  );
}

/**
 * The page's column, its `<main>`, on the page ground of `Sky.Root`: first
 * `CompactBar`, then on a page with a header sentence `Sky.Band`, then
 * `Content`. Its end clears the phone's tab bar by `--tab-bar-room`, and from
 * tablet up leaves 40px above the bottom safe area; the page's scroll padding
 * keeps the same room, so a focused element never sits under the tab bar.
 */
export function Main({
  className,
  children,
  ...props
}: ComponentProps<"main">) {
  return (
    <main
      id={CONTENT_ID}
      {...props}
      className={cn(
        "flex min-w-0 flex-1 flex-col outline-none scroller:scroll-pb-(--tab-bar-room)",
        className,
      )}
    >
      <Sky.Root
        className={cn(
          "flex-1",
          "pb-(--tab-bar-room)",
          "tablet:pb-[calc(var(--spacing-xl)+env(safe-area-inset-bottom,0px))]",
          "desktop:pb-[calc(var(--spacing-xl)+env(safe-area-inset-bottom,0px))]",
        )}
      >
        {children}
      </Sky.Root>
    </main>
  );
}

/**
 * The page bar and the page's regions, between the gutters: 16px on phone,
 * 24px from tablet up. On desktop the content grows up to 1120px, centred in
 * the column; the sky behind it spans the whole column.
 */
export function Content({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "mx-auto box-content max-w-(--content-width)",
        "px-m",
        "tablet:px-l",
        "desktop:px-l",
        className,
      )}
    />
  );
}

/**
 * `PageBar.Compact`, first in `Main`, outside the gutters: it spans the
 * column, and its title and controls line up with `Content`'s edges. The
 * page's scroll padding keeps a focused element clear of it. `anchor` is the
 * same ref as the page's `PageBar.Root`.
 */
export function CompactBar({ className, ...props }: PageBar.CompactProps) {
  return (
    <PageBar.Compact
      {...props}
      className={cn(
        "scroller:scroll-pt-[calc(var(--compact-bar)+var(--safe-top))]",
        "px-m",
        "tablet:px-l",
        "desktop:px-[max(var(--spacing-l),calc((var(--column-width,100%)-var(--content-width))/2))]",
        className,
      )}
    />
  );
}
