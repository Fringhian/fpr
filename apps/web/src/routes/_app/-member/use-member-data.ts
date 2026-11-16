import type { Id, Members } from "@fpr/contracts";
import { neededReads } from "../../../lib/api/needed-reads";
import { useMembers } from "../../../lib/members";
import { useSession } from "../../../lib/session/use-session";
import { useViewState } from "../../../lib/view-state/use-view-state";
import { usePortfolioReads } from "../-portfolio-sections/use-portfolio-reads";

/** A member as the members list has them: who, gain, balance, first entry. */
export type MemberRow = Members["members"][number];

/**
 * A member's page's reads for the period: who they are and how they did, from
 * the members list; their portfolio and their balance over time once they
 * have started; and the viewer's own, to compare, when the viewer is in the
 * race too. `row` is `null` once the list has loaded without them.
 */
export function useMemberData(userId: Id) {
  const { person } = useSession();
  const { setting } = useViewState();
  const members = useMembers(setting.period);

  const rows = members.data?.members;
  const row = rows && (rows.find(({ member }) => member.id === userId) ?? null);
  const viewer = rows?.find(({ member }) => member.id === person.id);
  const started = row?.firstEntryOn != null;
  const comparing =
    started && viewer?.firstEntryOn != null && viewer.member.id !== userId;

  const theirs = usePortfolioReads(userId, started);
  const yours = usePortfolioReads(person.id, comparing);
  return {
    row,
    viewer: comparing ? viewer : undefined,
    portfolio: theirs.portfolio.data,
    history: theirs.history.data,
    yourHistory: yours.history.data,
    yourPortfolio: yours.portfolio.data,
    ...neededReads([members, theirs.portfolio, theirs.history]),
  };
}
