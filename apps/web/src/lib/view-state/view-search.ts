import type { Id, LeaderboardBoard, Period, Unit } from "@fpr/contracts";
import { leaderboardBoards, periods, units } from "@fpr/contracts/values";
import type { SearchSchemaInput } from "@tanstack/react-router";
import type { PeriodSetting } from "../../components/molecules/period-control/period-control";
import { oneOf } from "../one-of";
import { readStoredSetting } from "./stored-setting";

/** The setting a person who never picked one sees: this month, in percent. */
export const DEFAULT_SETTING: PeriodSetting = { period: "1M", unit: "percent" };

const ID_SHAPE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The search every everyday page shares: `period` and `unit`, each from the
 * address when it names a valid one, else the setting kept in
 * `localStorage`, else the default. The router writes the result back in the
 * address, so the address always names the view.
 */
export function validatePeriodSearch(
  search: { period?: Period; unit?: Unit } & SearchSchemaInput,
): PeriodSetting {
  const stored = readStoredSetting();
  return {
    period:
      oneOf(periods, search.period) ?? stored?.period ?? DEFAULT_SETTING.period,
    unit: oneOf(units, search.unit) ?? stored?.unit ?? DEFAULT_SETTING.unit,
  };
}

/**
 * Home's search: `focus`, the member kept in focus, by id, and `standings`,
 * the board the standings rank by. Each is left out when it is not valid.
 */
export function validateHomeSearch(
  search: {
    focus?: Id | undefined;
    standings?: LeaderboardBoard | undefined;
  } & SearchSchemaInput,
): { focus?: Id | undefined; standings?: LeaderboardBoard | undefined } {
  const focus =
    typeof search.focus === "string" && ID_SHAPE.test(search.focus)
      ? search.focus.toLowerCase()
      : undefined;
  return { focus, standings: oneOf(leaderboardBoards, search.standings) };
}

/**
 * Shares' search: `q`, the search text, trimmed, and left out when empty. The
 * address reads digits alone, such as `?q=2024`, as a number.
 */
export function validateSharesSearch(
  search: { q?: string | undefined } & SearchSchemaInput,
): { q?: string | undefined } {
  const raw: unknown = search.q;
  const q =
    typeof raw === "string" || typeof raw === "number"
      ? String(raw).trim()
      : "";
  return { q: q === "" ? undefined : q };
}
