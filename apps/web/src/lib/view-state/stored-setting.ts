import { periods, units } from "@fpr/contracts/values";
import type { PeriodSetting } from "../../components/molecules/period-control/period-control";
import { oneOf } from "../one-of";

const KEY = "fpr.periodSetting.v1";

/**
 * The period and unit the person last picked, kept in `localStorage` across
 * visits, or nothing when none is kept, a value is no longer valid, or
 * storage can't be read.
 */
export function readStoredSetting():
  | { [Key in keyof PeriodSetting]: PeriodSetting[Key] | undefined }
  | undefined {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return undefined;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return undefined;
    const { period, unit } = value as Record<string, unknown>;
    return { period: oneOf(periods, period), unit: oneOf(units, unit) };
  } catch {
    return undefined;
  }
}

/** Keeps the setting for the next visit. Storage that refuses it changes nothing. */
export function storeSetting(setting: PeriodSetting): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(setting));
  } catch {
    // Private browsing or a full storage: the address still carries it.
  }
}
