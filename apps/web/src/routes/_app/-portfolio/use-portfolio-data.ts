import { neededReads } from "../../../lib/api/needed-reads";
import { useSession } from "../../../lib/session/use-session";
import { useLog } from "../-portfolio-sections/use-log";
import { usePortfolioReads } from "../-portfolio-sections/use-portfolio-reads";

/**
 * Portfolio's reads: the viewer's portfolio and balance over the period, and
 * their log, whose first page gives the latest changes.
 */
export function usePortfolioData() {
  const { person } = useSession();
  const { portfolio, history } = usePortfolioReads(person.id);
  const { log, rows, total } = useLog(person.id);

  return {
    portfolio: portfolio.data,
    history: history.data,
    rows,
    total,
    ...neededReads([portfolio, history, log]),
  };
}
