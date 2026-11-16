import type { Person } from "@fpr/contracts";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../../lib/api/use-api";
import { useSession } from "../../../lib/session/use-session";

/**
 * Everyone already there but the person, from the members list: an empty
 * list until it loads. `refresh` loads it again.
 */
export function useOthers(): {
  others: readonly Person[];
  refresh: () => void;
} {
  const api = useApi();
  const { person } = useSession();
  const members = useQuery(
    api.race.members.queryOptions({ input: { period: "1M" } }),
  );

  return {
    others: (members.data?.members ?? [])
      .map(({ member }) => member)
      .filter((member) => member.id !== person.id),
    refresh: () => void members.refetch(),
  };
}
