import type { Id, Race } from "@fpr/contracts";
import { useSession } from "../../../lib/session/use-session";
import { useHomeView } from "../../../lib/view-state/use-view-state";

/** Who Home draws in colour and shows in the focus panel. */
export type HomeCast = {
  /** The viewer, when they are in the race: a guest, an anonymous viewer or a member not started yet isn't. */
  youId: Id | null;
  /** The member kept in focus by the address, when they are in the race: their lane is open. */
  keptId: Id | null;
  /** The member the panel shows: the kept one, else the viewer, else the leader. */
  focusId: Id | null;
};

/**
 * Home's cast for the race, and the way to focus a member, kept in the
 * address; focusing none leaves `focus` out of it.
 */
export function useHomeCast(
  race: Race | undefined,
  leaderId: Id | undefined,
): HomeCast & { focusOn: (id: Id | null) => void } {
  const { person } = useSession();
  const { focus, setFocus } = useHomeView();

  const racing = new Set(race?.members.map(({ member }) => member.id));
  const youId = racing.has(person.id) ? person.id : null;
  const keptId = focus !== undefined && racing.has(focus) ? focus : null;

  return {
    youId,
    keptId,
    focusId: keptId ?? youId ?? leaderId ?? null,
    focusOn: (id) => setFocus(id ?? undefined),
  };
}
