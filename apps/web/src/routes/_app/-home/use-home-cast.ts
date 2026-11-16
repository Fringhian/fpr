import type { Id, Race } from "@fpr/contracts";
import { useSession } from "../../../lib/session/use-session";
import { useHomeView } from "../../../lib/view-state/use-view-state";
import type { GainStandings } from "./use-home-data";

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
 * address; focusing none leaves `focus` out of it. Who is in the race comes
 * from the race, or from the gain standings while the race loads; until one
 * of them has loaded, the address's `focus` is trusted as it is.
 */
export function useHomeCast(
  race: Race | undefined,
  gains: GainStandings | undefined,
): HomeCast & { focusOn: (id: Id | null) => void } {
  const { person } = useSession();
  const { focus, setFocus } = useHomeView();

  const ids =
    race?.members.map(({ member }) => member.id) ??
    gains?.rows.map(({ member }) => member.id);
  const racing = ids && new Set(ids);
  const youId = racing?.has(person.id) ? person.id : null;
  const keptId =
    focus !== undefined && (racing === undefined || racing.has(focus))
      ? focus
      : null;

  return {
    youId,
    keptId,
    focusId: keptId ?? youId ?? gains?.rows[0]?.member.id ?? null,
    focusOn: (id) => setFocus(id ?? undefined),
  };
}
