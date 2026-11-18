import type { ParsedLocation } from "@tanstack/react-router";
import * as Navigation from "../../components/organisms/navigation/navigation";

function tabIndex(pathname: string): number {
  const destination = Navigation.destinationAt(pathname);
  return destination === undefined
    ? -1
    : Navigation.MAIN_DESTINATIONS.indexOf(destination);
}

/**
 * The view transition of a tab bar link, which `theme.css` draws: the page
 * slides in from the side of the tab picked, `tab-forward` for a tab further
 * right, `tab-back` for one further left. None for the tab already open, from
 * a page outside the tabs, or under reduced motion. False where the browser
 * doesn't type view transitions, since the router would otherwise run the
 * browser's own crossfade.
 */
export const tabSlide = typeof CSS !== "undefined" &&
  CSS.supports("selector(:active-view-transition-type(tab))") && {
    types: ({
      fromLocation,
      toLocation,
    }: {
      fromLocation?: ParsedLocation;
      toLocation: ParsedLocation;
    }) => {
      const from = fromLocation ? tabIndex(fromLocation.pathname) : -1;
      const to = tabIndex(toLocation.pathname);
      if (
        from === -1 ||
        to === -1 ||
        from === to ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return false;
      }
      return [to > from ? "tab-forward" : "tab-back"];
    },
  };
