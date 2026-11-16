import type { Person } from "@fpr/contracts";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../lib/api/use-api";
import { useSession } from "../../lib/session/use-session";
import { DEFAULT_SETTING } from "../../lib/view-state/view-search";

/**
 * Everyone already there but the person, from the members list: an empty
 * list until it loads. `refresh` loads it again. No lighter read of people
 * is open to every role, so it reads the members list at the default period,
 * the same query the Members page makes on a first visit.
 */
export function useOthers(): {
  others: readonly Person[];
  refresh: () => void;
} {
  const api = useApi();
  const { person } = useSession();
  const members = useQuery(
    api.race.members.queryOptions({
      input: { period: DEFAULT_SETTING.period },
    }),
  );

  return {
    others: (members.data?.members ?? [])
      .map(({ member }) => member)
      .filter((member) => member.id !== person.id),
    refresh: () => void members.refetch(),
  };
}
