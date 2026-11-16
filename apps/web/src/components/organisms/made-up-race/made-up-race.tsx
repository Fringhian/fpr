import { type ComponentProps, useState } from "react";
import * as RaceCard from "../race-card/race-card";
import { MADE_UP_YOU, madeUpRace } from "./made-up-race-model";

export type MadeUpRaceProps = ComponentProps<"div">;

/**
 * The race with invented members over the last weeks, in percent, “You” in
 * colour: what FPR shows before sign-in. It never shows real data, and
 * nothing in it is selectable.
 */
export function MadeUpRace(props: MadeUpRaceProps) {
  const [members] = useState(() => madeUpRace(new Date()));

  return (
    <RaceCard.Race
      {...props}
      members={members}
      youId={MADE_UP_YOU}
      unit="percent"
    />
  );
}
