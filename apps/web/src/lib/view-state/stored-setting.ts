import { periods, units } from "@fpr/contracts/values";
import type { PeriodSetting } from "../../components/molecules/period-control/period-control";
import { oneOf } from "../one-of";

const KEY = "fpr.periodSetting.v1";

type StoredSetting = {
  [Key in keyof PeriodSetting]?: PeriodSetting[Key] | undefined;
};

/** The kept setting, read from `localStorage` once, then kept in step with every change. */
let kept: StoredSetting | undefined;

function readStorage(): StoredSetting {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return {};
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return {};
    const { period, unit } = value as Record<string, unknown>;
    return { period: oneOf(periods, period), unit: oneOf(units, unit) };
  } catch {
    return {};
  }
}

// Another tab's change, or storage cleared, is read again at the next use.
window.addEventListener("storage", (event) => {
  if (event.key === KEY || event.key === null) {
    kept = undefined;
  }
});

/**
 * The period and unit the person last picked, kept across visits; each is
 * missing when none is kept, it is no longer valid, or storage can't be read.
 */
export function readStoredSetting(): StoredSetting {
  kept ??= readStorage();
  return kept;
}

/**
 * Keeps a change for the next visit, over what is kept already: a period
 * alone leaves the kept unit as it is. Storage that refuses it keeps it for
 * this visit only.
 */
export function storeSetting(change: StoredSetting): void {
  kept = { ...readStoredSetting(), ...change };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(kept));
  } catch {
    // Private browsing or a full storage: the address still carries it.
  }
}
