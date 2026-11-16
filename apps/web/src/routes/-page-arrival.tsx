import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/** How long a page's heading may take to render, while its data loads. */
const HEADING_WAIT_MS = 3000;

/**
 * Where the visitor is: the page's path, plus the step of a step flow, which
 * `?step=` names. Any other search value, such as the period, changes the
 * view in place, not the page.
 */
function useArrivedPlace(): string | undefined {
  return useRouterState({
    select: ({ resolvedLocation }) => {
      if (resolvedLocation === undefined) return undefined;
      const { step } = resolvedLocation.search as { step?: unknown };
      return step === undefined
        ? resolvedLocation.pathname
        : `${resolvedLocation.pathname}?step=${String(step)}`;
    },
  });
}

/** Calls `found` with the page's heading as soon as it renders, for a while. */
function awaitHeading(found: (heading: HTMLHeadingElement) => void) {
  const find = () => document.querySelector<HTMLHeadingElement>("main h1");
  const now = find();
  if (now !== null) {
    found(now);
    return () => undefined;
  }
  const observer = new MutationObserver(() => {
    const heading = find();
    if (heading === null) return;
    stop();
    found(heading);
  });
  const timer = window.setTimeout(() => observer.disconnect(), HEADING_WAIT_MS);
  const stop = () => {
    observer.disconnect();
    window.clearTimeout(timer);
  };
  observer.observe(document.body, { childList: true, subtree: true });
  return stop;
}

function focusLost(): boolean {
  const active = document.activeElement;
  return active === null || active === document.body || !active.isConnected;
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
    const first = arrivals.current === 0;
    arrivals.current += 1;
    return awaitHeading((heading) => {
      const brand = i18n.t("brand");
      const name =
        document.querySelector("[data-page-title]")?.textContent?.trim() ||
        heading.textContent?.trim();
      document.title = name ? `${name} · ${brand}` : brand;
      if (first) return;
      if (focusLost()) {
        focusHeading(heading);
      } else {
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
