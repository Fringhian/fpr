import { neededReads } from "../../../lib/api/needed-reads";
import { useSession } from "../../../lib/session/use-session";
import { useLog } from "../-portfolio-sections/use-log";
import { usePortfolioReads } from "../-portfolio-sections/use-portfolio-reads";

/**
 * Portfolio's reads: the viewer's portfolio and balance over the period, and
 * their log, whose first page gives the latest changes and the day the cash
 * was set.
 */
export function usePortfolioData() {
  const { person } = useSession();
  const { portfolio, history } = usePortfolioReads(person.id);
  const { log, rows } = useLog(person.id, portfolio.data);

  const cash = log.data?.pages
    .flatMap((page) => page.entries)
    .find((entry) => entry.type === "cash");
  return {
    portfolio: portfolio.data,
    history: history.data,
    rows,
    cashSetAt: cash?.effectiveAt,
    ...neededReads([portfolio, history, log]),
  };
}
