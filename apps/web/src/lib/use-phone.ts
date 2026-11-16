import { useSyncExternalStore } from "react";

// Every width below the `tablet:` breakpoint, `--breakpoint-tablet` in `theme.css`.
const PHONE_QUERY = "(width < 40rem)";

let query: MediaQueryList | null = null;

function phoneQuery(): MediaQueryList | null {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return null;
  }
  query ??= window.matchMedia(PHONE_QUERY);
  return query;
}

function subscribe(onChange: () => void): () => void {
  const list = phoneQuery();
  list?.addEventListener("change", onChange);
  return () => list?.removeEventListener("change", onChange);
}

function isPhone(): boolean {
  return phoneQuery()?.matches ?? false;
}

function isPhoneOnServer(): boolean {
  return false;
}

/**
 * Whether the window is phone width, below the `tablet:` breakpoint. It
 * re-renders when the window crosses it, and is false where there is no
 * window, such as a page rendered to markup.
 */
export function usePhone(): boolean {
  return useSyncExternalStore(subscribe, isPhone, isPhoneOnServer);
}
