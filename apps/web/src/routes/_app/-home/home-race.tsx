import type { Id, Race } from "@fpr/contracts";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MarketStatus } from "../../../components/atoms/market-status/market-status";
import * as RaceCard from "../../../components/organisms/race-card/race-card";
import type { GainUnit } from "../../../lib/gain";
import { HelpInfo } from "../../../lib/help-info";
import { raceMembers } from "./race-members";
import type { HomeCast } from "./use-home-cast";

/**
 * The race card's header: the market status, with the time of the prices or
 * the day of the close they are from, then ⓘ, which says what the race shows.
 */
function Header({ race }: { race: Race | undefined }) {
  const { t } = useTranslation();

  return (
    <RaceCard.Header>
      <div className="flex items-center gap-s">
        {race?.latestPricesAt == null ? null : (
          <MarketStatus
            status={race.refreshesRunning ? "open" : "closed"}
            pricedAt={race.latestPricesAt}
          />
        )}
        <HelpInfo section="race" title={t("helpInfo.race.title")} align="end">
          {t("helpInfo.race.body")}
        </HelpInfo>
      </div>
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
