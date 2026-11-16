import type { PeoplePerson } from "@fpr/contracts";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../lib/api/use-api";
import { useSession } from "../../lib/session/use-session";

/**
 * Everyone but the person, every role, in the order they were added, from
 * `GET /people`: an empty list until it loads. `refresh` loads it again.
 */
export function useOthers(): {
  others: readonly PeoplePerson[];
  refresh: () => void;
} {
  const api = useApi();
  const { person } = useSession();
  const people = useQuery(api.me.people.queryOptions());

  return {
    others: (people.data ?? []).filter((other) => other.id !== person.id),
    refresh: () => void people.refetch(),
  };
}
