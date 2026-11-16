// The member strip's parts, imported as a namespace: `import * as MemberStrip from "…/member-strip"`.
import type { ComponentProps } from "react";
import type { CurveProps, FiguresProps } from "./member-strip-figures";
import type { HoldingsProps } from "./member-strip-holdings";
import {
  Caret,
  Curve,
  Figures,
  Holdings,
  NoShares,
  Root,
  Who,
  type WhoProps,
} from "./member-strip-parts";

export type { StripHolding } from "./member-strip-holdings";
export {
  Caret,
  Curve,
  Figures,
  Holdings,
  List,
  NoShares,
  Root,
  Who,
  type WhoProps,
} from "./member-strip-parts";

type WhoKey =
  | "name"
  | "color"
  | "photo"
  | "link"
  | "you"
  | "since"
  | "incomplete";

export type BasicProps = Pick<WhoProps, WhoKey> &
  Pick<CurveProps, "points" | "yours"> &
  Pick<FiguresProps, "gain" | "unit" | "balanceEur"> & {
    /** Their largest holdings, largest first, with their weight. */
    holdings: HoldingsProps["holdings"];
    /** How many holdings they have in all. */
    holdingCount: number;
  } & Omit<
    ComponentProps<"li">,
    | WhoKey
    | "points"
    | "yours"
    | "gain"
    | "unit"
    | "balanceEur"
    | "holdings"
    | "holdingCount"
  >;

/**
 * One member in the Members list: their picture and name, “since” their first
 * entry, their gain over the period against the viewer's, their balance, and
 * their top holdings with their weights. The whole strip opens their page.
 * Before their first entry, it says “No shares yet” in the curve's place. An
 * anonymous viewer reads pseudonyms, initials, percentages and weights only.
 */
export function Basic({
  name,
  color,
  photo,
  link,
  you,
  since,
  incomplete,
  points,
  yours,
  gain,
  unit,
  balanceEur,
  holdings,
  holdingCount,
  ...props
}: BasicProps) {
  const started = since !== null;

  return (
    <Root {...props} you={you}>
      <Who {...{ name, color, photo, link, you, since, incomplete }} />
      <Caret />
      {started ? (
        <Curve
          name={name}
          color={color}
          points={points}
          yours={yours}
          unit={unit}
        />
      ) : (
        <NoShares />
      )}
      <Figures gain={gain} unit={unit} balanceEur={balanceEur} />
      <Holdings holdings={holdings} count={holdingCount} />
    </Root>
  );
}
