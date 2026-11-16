import type { Id, LeaderboardBoard } from "@fpr/contracts";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { PeriodSetting } from "../../components/molecules/period-control/period-control";
import { useSession } from "../session/use-session";
import { storeSetting } from "./stored-setting";
import type { validateHomeSearch, validateSharesSearch } from "./view-search";

/** Every view value an everyday page's address can hold. */
type ViewSearch = Partial<PeriodSetting> &
  ReturnType<typeof validateHomeSearch> &
  ReturnType<typeof validateSharesSearch>;

/**
 * Changes the current page's address in place: same page, search merged,
 * no new history entry and no scroll back to the top.
 */
function useReplaceSearch() {
  const navigate = useNavigate();

  return (patch: ViewSearch) =>
    navigate({
      to: ".",
      search: (previous) => ({ ...previous, ...patch }),
      replace: true,
      resetScroll: false,
    });
}

/**
 * The period and unit every everyday page shares, and the way to change them:
 * a change goes in the address and in `localStorage`. An anonymous viewer's
 * unit is always percent, whatever the address says, and their change keeps
 * the period alone, so the unit a member keeps on a shared device stays.
 */
export function useViewState(): {
  setting: PeriodSetting;
  setSetting: (setting: PeriodSetting) => void;
  anonymous: boolean;
} {
  const search = useSearch({ from: "/_app" });
  const { readOnly } = useSession();
  const replaceSearch = useReplaceSearch();

  const percentOnly = (setting: PeriodSetting): PeriodSetting =>
    readOnly ? { ...setting, unit: "percent" } : setting;

  return {
    setting: percentOnly(search),
    setSetting: (setting) => {
      storeSetting(readOnly ? { period: setting.period } : setting);
      void replaceSearch(percentOnly(setting));
    },
    anonymous: readOnly,
  };
}

/**
 * Home's view: the member kept in focus, or none, and the board the standings
 * rank by, `gain` by default. An anonymous viewer ranks by gain only.
 */
export function useHomeView(): {
  focus: Id | undefined;
  standings: LeaderboardBoard;
  setFocus: (focus: Id | undefined) => void;
  setStandings: (standings: LeaderboardBoard) => void;
} {
  const search = useSearch({ from: "/_app/" });
  const { readOnly } = useSession();
  const replaceSearch = useReplaceSearch();

  return {
    focus: search.focus,
    standings: readOnly ? "gain" : (search.standings ?? "gain"),
    setFocus: (focus) => void replaceSearch({ focus }),
    setStandings: (standings) => void replaceSearch({ standings }),
  };
}

/**
 * Shares' search: `q`, the text as typed, for the search field; `query`, the
 * same text trimmed, which the list searches by; and the way to change it.
 * Each is empty when there is none.
 */
export function useSharesQuery(): {
  q: string;
  query: string;
  setQ: (q: string) => void;
} {
  const search = useSearch({ from: "/_app/shares/" });
  const replaceSearch = useReplaceSearch();

  const q = search.q ?? "";

  return {
    q,
    query: q.trim(),
    setQ: (next) =>
      void replaceSearch({ q: next.trim() === "" ? undefined : next }),
  };
}
