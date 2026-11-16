import type { Race, ShareLeaderboard } from "@fpr/contracts";
import { useTranslation } from "react-i18next";
import { PageMessage } from "../../../components/templates/page-message/page-message";
import { cn } from "../../../lib/cn";
import {
  useHomeView,
  useViewState,
} from "../../../lib/view-state/use-view-state";
import { Screen } from "../../-shell/screen";
import { useLoadFailedMessage } from "../../-states/load-failed";
import { HomeFocus, HomeFocusLoading } from "./home-focus";
import { HomeRace } from "./home-race";
import { HomeGreeting, HomeSentence } from "./home-sentence";
import { HomeStandings } from "./home-standings";
import { type HomeCast, useHomeCast } from "./use-home-cast";
import { type GainStandings, useHomeData } from "./use-home-data";

/** The race and the focus panel: side by side on desktop, the panel under the race on tablet and phone. */
const TOP = cn(
  "grid gap-m",
  "grid-cols-1",
  "tablet:grid-cols-1",
  "desktop:grid-cols-[minmax(0,1fr)_18.75rem]",
);

/** The focused member's panel, or its place until the standings load. */
function Focus({
  gains,
  cast,
}: {
  gains: GainStandings | undefined;
  cast: HomeCast;
}) {
  const { setting } = useViewState();

  const row = gains?.rows.find(({ member }) => member.id === cast.focusId);

  if (gains === undefined) return <HomeFocusLoading />;
  return row === undefined ? null : (
    <HomeFocus
      member={row.member}
      gain={row.gain}
      you={row.member.id === cast.youId}
      backToYou={cast.youId !== null && row.member.id !== cast.youId}
      {...setting}
    />
  );
}

/** The header sentence once the gain standings load, the greeting alone until then. */
function Header({
  gains,
  star,
}: {
  gains: GainStandings | undefined;
  star: ShareLeaderboard["rows"][number] | undefined;
}) {
  const { setting } = useViewState();

  return gains === undefined ? (
    <HomeGreeting />
  ) : (
    <HomeSentence rows={gains.rows} star={star} {...setting} />
  );
}

/** Whether the race has loaded with nobody in it. */
function isEmpty(race: Race | undefined): boolean {
  return race !== undefined && race.members.length === 0;
}

/**
 * Home: the header sentence, the race with the focused member's panel, and
 * the standings. Each holds its place while it loads, and a failed load
 * leaves a message with Retry under the page bar. With nobody in the race,
 * the standings alone say so.
 */
export function HomeScreen() {
  const { t } = useTranslation();
  const { setting, anonymous } = useViewState();
  const { standings: board, setStandings } = useHomeView();
  const data = useHomeData({ ...setting, board });
  const cast = useHomeCast(data.race, data.gains?.rows[0]?.member.id);
  const failed = useLoadFailedMessage(data.retry);

  const title = t("pages.home");
  const period = t(`sentence.period.${setting.period}.inline`);
  const headline = (data.gains?.rows.length ?? 0) > 0;

  if (data.failed) {
    return (
      <Screen title={title} period>
        <PageMessage {...failed} />
      </Screen>
    );
  }
  return (
    <Screen
      title={title}
      period
      heading={!headline}
      header={<Header gains={data.gains} star={data.starShare} />}
    >
      <div className="grid gap-m pb-l">
        {isEmpty(data.race) ? null : (
          <div className={TOP}>
            <HomeRace
              race={data.race}
              unit={setting.unit}
              cast={cast}
              onFocusMember={cast.focusOn}
            />
            <Focus gains={data.gains} cast={cast} />
          </div>
        )}
        <HomeStandings
          standings={data.standings}
          board={board}
          onBoardChange={setStandings}
          anonymous={anonymous}
          period={period}
          viewerId={cast.youId}
          keptId={cast.keptId}
          onFocusMember={cast.focusOn}
        />
      </div>
    </Screen>
  );
}
