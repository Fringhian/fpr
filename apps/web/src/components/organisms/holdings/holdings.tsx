// The holdings' parts, imported as a namespace: `import * as Holdings from "…/holdings"`.
import type { PortfolioHolding, ShareSummary } from "@fpr/contracts";
import {
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  useMemo,
} from "react";
import { cn } from "../../../lib/cn";
import type { GainUnit } from "../../../lib/gain";
import type { Look } from "../../../lib/look";
import { pricePoints } from "../../../lib/series";
import * as HoldingCard from "../../molecules/holding-card/holding-card";

/** The grid the cards go in: one column on phone, two on tablet, filling the width on desktop. */
export function Grid({ className, ...props }: ComponentProps<"ul">) {
  return (
    <ul
      {...props}
      className={cn(
        "m-0 grid list-none gap-m p-0",
        "grid-cols-1",
        "tablet:grid-cols-2",
        "desktop:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]",
        className,
      )}
    />
  );
}

/** One card's place in the grid, the card stretched to the row's height. */
export function Item({ className, ...props }: ComponentProps<"li">) {
  return <li {...props} className={cn("grid min-w-0", className)} />;
}

/** The size a holding sorts by: its value, or its weight for an anonymous viewer; a pending one last. */
function size({ valueEur, weight }: PortfolioHolding): number {
  const value = valueEur ?? weight;
  return value === null || value === undefined ? -1 : Number(value);
}

/** The viewer, when they hold some of the same shares: their picture goes on those cards. */
export interface HeldByYou {
  look: Look;
  /** The ids of the shares the viewer holds. */
  shareIds: ReadonlySet<string>;
}

type CardOptions = Pick<
  BasicProps,
  "unit" | "shareLink" | "heldByYou" | "actions" | "timeZone"
> & { anonymous: boolean };

/** One holding's card, its curve drawn from the share's prices over the period. */
function Card({
  holding,
  unit,
  anonymous,
  shareLink,
  heldByYou,
  actions,
  timeZone,
}: { holding: PortfolioHolding } & CardOptions) {
  const curve = useMemo(() => pricePoints(holding.series), [holding.series]);
  const { share } = holding;

  return (
    <HoldingCard.Basic
      name={share.name}
      kind={share.kind}
      quantity={holding.quantity}
      latestPrice={holding.latestPrice}
      curve={curve}
      valueEur={holding.valueEur}
      weight={holding.weight}
      gain={holding.gain}
      unit={unit}
      anonymous={anonymous}
      link={shareLink(share)}
      you={heldByYou?.shareIds.has(share.id) ? heldByYou.look : null}
      actions={actions?.(holding)}
      timeZone={timeZone}
    />
  );
}

export type BasicProps = {
  /** The member's holdings, in any order: they show largest first, a pending one last. */
  holdings: readonly PortfolioHolding[];
  /** The unit setting the gains read in. */
  unit: GainUnit;
  /** The viewer is anonymous: weights replace quantities and values. */
  anonymous?: boolean | undefined;
  /** The link each card opens: the router's link to the share's page. */
  shareLink: (share: ShareSummary) => ReactElement;
  /** On someone else's page, the viewer and the shares they hold too. */
  heldByYou?: HeldByYou | null | undefined;
  /** Each card's ⋯ items, such as Buy more and Sell. Without them, the cards have no ⋯. */
  actions?: ((holding: PortfolioHolding) => ReactNode) | undefined;
  /** The time zone a price's time and day are read in. The browser's by default. */
  timeZone?: string | undefined;
  /** Cards after the holdings, each in an `Item`, such as the cash card. */
  children?: ReactNode;
} & Omit<ComponentProps<"ul">, "children">;

/**
 * A portfolio's holdings, one card per share, largest first, every one shown:
 * on a member's page and on Portfolio. A card opens its share; the viewer's
 * picture marks a share they hold too, and `actions` gives each card its ⋯.
 */
export function Basic({
  holdings,
  unit,
  anonymous = false,
  shareLink,
  heldByYou,
  actions,
  timeZone,
  children,
  ...props
}: BasicProps) {
  const sorted = holdings.toSorted((a, b) => size(b) - size(a));
  const options = { unit, anonymous, shareLink, heldByYou, actions, timeZone };

  return (
    <Grid {...props}>
      {sorted.map((holding) => (
        <Item key={holding.share.id}>
          <Card holding={holding} {...options} />
        </Item>
      ))}
      {children}
    </Grid>
  );
}
