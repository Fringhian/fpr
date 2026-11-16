import type { Portfolio } from "@fpr/contracts";
import type { Mover } from "../../../components/organisms/mover-row/mover-row";

/** How many holdings the focus panel lists. */
const SHOWN = 3;

/**
 * A holding's effect on the period: its gain in euros, or for an anonymous
 * viewer, who has none, its gain in percent weighted by its share of the
 * portfolio. Either way, the size of the move, up or down.
 */
function effect({ gain, weight }: Portfolio["holdings"][number]): number {
  if (gain === null) return 0;
  const eur = gain.eur as string | undefined;
  return Math.abs(
    eur === undefined
      ? Number(gain.percent ?? 0) * Number(weight ?? 0)
      : Number(eur),
  );
}

/** The holdings that moved the member's period most, biggest effect first, priced ones only. */
export function moversOf(portfolio: Portfolio): Mover[] {
  return portfolio.holdings
    .filter((holding) => holding.gain !== null)
    .toSorted((a, b) => effect(b) - effect(a))
    .slice(0, SHOWN)
    .map(({ share, gain }) => ({
      id: share.id,
      name: share.name,
      gain: gain ?? { percent: null },
    }));
}
