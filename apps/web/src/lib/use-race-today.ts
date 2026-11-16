import type { IsoDate } from "@fpr/contracts";
import { useSyncExternalStore } from "react";
import { raceDayOf } from "./race-day";

// Read again every minute and whenever the page shows again: a page left open
// past midnight, or woken from sleep, moves to the new day.
function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, 60_000);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", onChange);
  };
}

const today = () => raceDayOf(Date.now());

/** The race's day now, which turns at midnight in the race's zone while the page stays open. */
export function useRaceToday(): IsoDate {
  return useSyncExternalStore(subscribe, today);
}
