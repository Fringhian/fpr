import { useNavigate } from "@tanstack/react-router";
import type { ComponentProps } from "react";

/**
 * A link to a page of the app by its whole address, `back` from the search,
 * followed by the router rather than a page load: a link with a modifier
 * key still opens a new tab.
 */
export function BackLink({
  href,
  onClick,
  ...props
}: { href: string } & ComponentProps<"a">) {
  const navigate = useNavigate();

  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        void navigate({ href });
      }}
    />
  );
}
