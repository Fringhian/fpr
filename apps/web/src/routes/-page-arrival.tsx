import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { pagePlace } from "../lib/page-place.ts";

/** How long a page's heading may take to render, while its data loads. */
const HEADING_WAIT_MS = 3000;

function useArrivedPlace(): string | undefined {
  return useRouterState({
    select: ({ resolvedLocation }) =>
      resolvedLocation === undefined ? undefined : pagePlace(resolvedLocation),
  });
}

/**
 * Calls `seen` with the page's heading as soon as it renders, then again each
 * time another heading replaces it, as a loading page's does, for a while.
 */
function followHeading(
  seen: (heading: HTMLHeadingElement, first: boolean) => void,
) {
  let last: HTMLHeadingElement | null = null;
  const look = () => {
    const heading = document.querySelector<HTMLHeadingElement>("main h1");
    if (heading === null || heading === last) return;
    seen(heading, last === null);
    last = heading;
  };
  const observer = new MutationObserver(look);
  observer.observe(document.body, { childList: true, subtree: true });
  const timer = window.setTimeout(() => observer.disconnect(), HEADING_WAIT_MS);
  look();
  return () => {
    observer.disconnect();
    window.clearTimeout(timer);
  };
}

/**
 * Whether focus is free to take: nowhere, gone with the last page, or on a
 * heading an arrival focused. A page can render before the router marks it
 * arrived, so the last arrival may have focused this one's heading already.
 */
function focusFree(): boolean {
  const active = document.activeElement;
  return (
    active === null ||
    active === document.body ||
    !active.isConnected ||
    active.matches('h1[tabindex="-1"]')
  );
}

/** Focuses the heading until it loses focus, without moving the page. */
function focusHeading(heading: HTMLHeadingElement) {
  heading.setAttribute("tabindex", "-1");
  heading.addEventListener("blur", () => heading.removeAttribute("tabindex"), {
    once: true,
  });
  heading.focus({ preventScroll: true });
}

/**
 * Tells everyone which page or step arrived, as a full page load would. The
 * tab's title names it, from the page bar's title, else the page's heading.
 * On each arrival after the first, a screen reader hears the heading: focus
 * moves to it when the control that had focus went away with the last page,
 * and otherwise stays put while a polite live region reads it.
 */
export function PageArrival() {
  const { i18n } = useTranslation();
  const place = useArrivedPlace();
  const [announcement, setAnnouncement] = useState("");
  const arrivals = useRef(0);

  useEffect(() => {
    if (place === undefined) return;
    const load = arrivals.current === 0;
    arrivals.current += 1;
    let focused = false;
    return followHeading((heading, first) => {
      const brand = i18n.t("brand");
      const name =
        document.querySelector("[data-page-title]")?.textContent?.trim() ||
        heading.textContent?.trim();
      document.title = name ? `${name} · ${brand}` : brand;
      if (load) return;
      // A heading that replaces the focused one takes its focus over.
      if ((first || focused) && focusFree()) {
        focusHeading(heading);
        focused = true;
      } else if (first) {
        setAnnouncement(heading.textContent?.trim() ?? "");
      }
    });
  }, [place, i18n]);

  return (
    <p aria-live="polite" className="sr-only">
      {announcement}
    </p>
  );
}
