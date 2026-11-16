import type { Id, Race } from "@fpr/contracts";
import { useMemo } from "react";
import { MarketStatus } from "../../../components/atoms/market-status/market-status";
import * as RaceCard from "../../../components/organisms/race-card/race-card";
import type { GainUnit } from "../../../lib/gain";
import { raceMembers } from "./race-members";
import type { HomeCast } from "./use-home-cast";

/** The race card's header: the market status, with the time of the prices or the day of the close they are from. */
function Header({ race }: { race: Race | undefined }) {
  return (
    <RaceCard.Header>
      {race?.latestPricesAt == null ? null : (
        <MarketStatus
          status={race.refreshesRunning ? "open" : "closed"}
          pricedAt={race.latestPricesAt}
        />
      )}
    </RaceCard.Header>
  );
}

/**
 * Home's race card: every member's gain over the period, the viewer and the
 * focused member in colour, today's points dashed. Selecting a curve, a
 * picture or a sign focuses its member. Without the race yet, it holds its
 * place.
 */
export function HomeRace({
  race,
  unit,
  cast,
  onFocusMember,
}: {
  race: Race | undefined;
  unit: GainUnit;
  cast: HomeCast;
  onFocusMember: (id: Id) => void;
}) {
  const members = useMemo(
    () => (race === undefined ? [] : raceMembers(race, unit)),
    [race, unit],
  );

  return (
    <RaceCard.Root>
      <Header race={race} />
      {race === undefined ? (
        <RaceCard.Loading />
      ) : (
        <RaceCard.Race
          members={members}
          youId={cast.youId}
          focusId={cast.focusId}
          lastClose={race.lastCloseOn}
          unit={unit}
          onFocusMember={onFocusMember}
        />
      )}
    </RaceCard.Root>
  );
}
