import { Collapsible } from "@base-ui/react/collapsible";
import type { IsoDate } from "@fpr/contracts";
import type { ComponentProps, ReactNode } from "react";
import type { UnitScale } from "../../../lib/bar-track";
import { cn, stateClassName } from "../../../lib/cn";
import type { LaneValue } from "../../../lib/lane";
import type { MemberColor } from "../../../lib/member-color";
import { Picture, type PictureMedal } from "../../atoms/picture/picture";
import { type LaneBest, Name } from "./lane-name";
import { Panel } from "./lane-panel";
import { Bar, Figure } from "./lane-value";

export { type LaneBest, Name, YouSuffix } from "./lane-name";
export { NotStarted } from "./lane-not-started";
export { Panel } from "./lane-panel";
export { Bar, Figure } from "./lane-value";

/** The lane, Base UI's collapsible root: `open`, `defaultOpen` and `onOpenChange` hold whether it is open. */
export function Root({
  className,
  ...props
}: ComponentProps<typeof Collapsible.Root>) {
  return (
    <Collapsible.Root
      {...props}
      className={stateClassName("rounded-m", className)}
    />
  );
}

const row = cn(
  "grid w-full cursor-pointer items-center rounded-m bg-transparent text-start text-primary transition-colors duration-s ease-soft",
  "grid-cols-[auto_minmax(0,1fr)_3.5rem_4.25rem] gap-[0.625rem] px-s py-[0.4375rem]",
  "tablet:grid-cols-[auto_11.25rem_minmax(0,1fr)_5.5rem] tablet:gap-[0.875rem] tablet:px-[0.75rem] tablet:py-s",
  "desktop:grid-cols-[auto_14.375rem_minmax(0,1fr)_5.5rem] desktop:gap-[0.875rem] desktop:px-[0.75rem] desktop:py-s",
  // A light charcoal veil, so it reads on a white lane and on the viewer's tinted one.
  "hover:bg-primary/5",
  "focus-visible:focus-ring",
);

/** The row that opens the lane, Base UI's collapsible trigger, in four columns: the picture, `Name`, `Bar`, then `Figure`. */
export function Row({
  className,
  ...props
}: ComponentProps<typeof Collapsible.Trigger>) {
  return (
    <Collapsible.Trigger
      {...props}
      className={stateClassName(row, className)}
    />
  );
}

/**
 * The lane's own props, then every prop of `Root`: `open`, `defaultOpen` and
 * `onOpenChange`, called when the lane is pressed with the state it asks for,
 * and `className`, a string or a function of its state.
 */
export type LaneProps = {
  /** The member's display name, or an anonymous viewer's pseudonym. */
  name: string;
  /** The member's colour: their picture's pastel and their bar. */
  color: MemberColor;
  /** The member's photo, or `null` for their initial. An anonymous viewer always receives `null`. */
  photo?: string | null | undefined;
  /** The viewer's own lane: tinted, with “· you” after the name. */
  you?: boolean | undefined;
  /** The first three lanes' gold, silver and bronze ring, on tablet and desktop only. */
  medal?: PictureMedal | null | undefined;
  /** The member's best share over the period, under the name on tablet and desktop, and in the opened lane on phone. `null` when they held no priced share. */
  best?: LaneBest | null | undefined;
  /**
   * What the lane shows: `{ board: "gain", gain, unit }` for the gain over
   * the period in the unit setting, or `{ board: "balance", balance }`. An
   * anonymous viewer has no euros: the gain reads in percent, and a `null`
   * balance draws nothing.
   */
  value: LaneValue;
  /**
   * The lowest and highest values across every lane of the standings in each
   * unit, from `laneScale`, so the zero line sits at the same place in each
   * lane and the bars of one unit compare. A gain with no percentage (a start
   * at zero) reads in euros and is drawn on the euro scale. Without it, the
   * lane is measured against itself.
   */
  scale?: UnitScale | undefined;
  /** The day the member's history starts when it is after the period's start: their gain is measured from it, and the lane says “since 12 Feb”. */
  measuredFrom?: IsoDate | null | undefined;
  /** A held share has no price yet: it is left out of the balance, and the lane says “Incomplete”. */
  incomplete?: boolean | undefined;
  /** What the opened lane shows under its row at every width, such as a link to the member's page. */
  children?: ReactNode;
} & Omit<
  ComponentProps<typeof Collapsible.Root>,
  | "name"
  | "color"
  | "photo"
  | "you"
  | "medal"
  | "best"
  | "value"
  | "scale"
  | "measuredFrom"
  | "incomplete"
  | "children"
>;

/**
 * One member in the standings: their picture, name and best share, a bar from
 * the zero line, and their value. Gains go right of the zero line and losses
 * left; the order and the bars show the ranking, with no rank numbers. The
 * whole row is a button that opens the lane in place: on phone, the opened
 * lane shows the best share under the row, then `children`.
 */
export function Basic({
  name,
  color,
  photo = null,
  you = false,
  medal = null,
  best = null,
  value,
  scale,
  measuredFrom = null,
  incomplete = false,
  children,
  className,
  ...props
}: LaneProps) {
  return (
    <Root
      {...props}
      className={stateClassName(you ? "bg-highlight" : "", className)}
    >
      <Row>
        <Picture
          name={name}
          color={color}
          photo={photo}
          size="s"
          medal={medal}
          aria-hidden
        />
        <Name
          name={name}
          you={you}
          best={best}
          measuredFrom={measuredFrom}
          incomplete={incomplete}
        />
        <Bar value={value} scale={scale} color={color} />
        <Figure value={value} />
      </Row>
      <Panel best={best}>{children}</Panel>
    </Root>
  );
}
