import type { Period } from "@fpr/contracts";
import { useQuery } from "@tanstack/react-query";
import { liveView } from "./api/query-client";
import { useApi } from "./api/use-api";

/**
 * Every member over the period, with their gain, balance, curve and top
 * holdings: the Members page's list, and who a member's page is about. One
 * cache entry per period, which onboarding's list of others shares.
 */
export function useMembers(period: Period) {
  const api = useApi();

  return useQuery(
    api.race.members.queryOptions({ input: { period }, ...liveView }),
  );
}
