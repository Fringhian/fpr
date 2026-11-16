import type { ShareHolder } from "@fpr/contracts";
import { Link } from "@tanstack/react-router";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "../../../components/atoms/badge/badge";
import { GainChip } from "../../../components/atoms/gain-chip/gain-chip";
import { Picture } from "../../../components/atoms/picture/picture";
import * as HoldingCard from "../../../components/molecules/holding-card/holding-card";
import * as Holdings from "../../../components/organisms/holdings/holdings";
import { formatDate } from "../../../lib/format/date";
import { formatPercent } from "../../../lib/format/money";
import { formatQuantity } from "../../../lib/format/number";
import { useLanguage } from "../../../lib/i18n";
import { lookOf } from "../../../lib/look";
import { inThisYear, RACE_TIME_ZONE } from "../../../lib/race-day";
import { useSession } from "../../../lib/session/use-session";
import { useViewState } from "../../../lib/view-state/use-view-state";

const holds = (holder: ShareHolder) => !/^0(?:\.0+)?$/.test(holder.quantity);

/** “40 units · since 12 Jan”, an anonymous viewer's “12.4% of their portfolio · since 12 Jan”. */
function HolderLine({ holder }: { holder: ShareHolder }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { anonymous } = useViewState();

  const first = holder.changes[0]?.effectiveAt;
  const year = first !== undefined && !inThisYear(first);
  const amount = anonymous
    ? holder.weight === null
      ? null
      : t("sharePage.holders.weight", {
          weight: formatPercent(holder.weight, language),
        })
    : t("holdingCard.units", {
        count: Number(holder.quantity),
        quantity: formatQuantity(holder.quantity, language),
      });
  const since =
    first === undefined
      ? null
      : t("sharePage.holders.since", {
          date: formatDate(first, language, { timeZone: RACE_TIME_ZONE, year }),
        });

  return (
    <HoldingCard.Caption>
      {[holds(holder) ? amount : null, since].filter(Boolean).join(" · ")}
    </HoldingCard.Caption>
  );
}

/**
 * One holder's card: their picture and name, opening their page, with their
 * gain on the share since they bought, then how much they hold and since
 * when. The viewer's own card is tinted; a past holder's says so.
 */
function HolderCard({ holder }: { holder: ShareHolder }) {
  const { t } = useTranslation();
  const { person } = useSession();
  const { setting } = useViewState();
  const nameId = useId();

  const look = lookOf(holder.person);
  const you = holder.person.id === person.id;

  return (
    <HoldingCard.Root
      aria-labelledby={nameId}
      className={you ? "bg-highlight shadow-none" : undefined}
    >
      <HoldingCard.Header>
        <Picture aria-hidden {...look} size="s" />
        <HoldingCard.Name
          id={nameId}
          link={
            <Link to="/members/$userId" params={{ userId: holder.person.id }} />
          }
        >
          {you ? t("raceCard.you") : look.name}
        </HoldingCard.Name>
        {!holds(holder) ? (
          <Badge state="heldBefore" />
        ) : holder.gain ? (
          <GainChip gain={holder.gain} unit={setting.unit} />
        ) : null}
      </HoldingCard.Header>
      <HolderLine holder={holder} />
    </HoldingCard.Root>
  );
}

/**
 * Who holds the share, “Who holds it · 6”: one card per member holding it,
 * first in first, then those who held it before.
 */
export function ShareHolders({ holders }: { holders: readonly ShareHolder[] }) {
  const { t } = useTranslation();
  const titleId = useId();

  const current = holders.filter(holds);
  const sorted = holders.toSorted(
    (a, b) =>
      Number(holds(b)) - Number(holds(a)) ||
      (a.changes[0]?.effectiveAt ?? "").localeCompare(
        b.changes[0]?.effectiveAt ?? "",
      ),
  );

  return (
    <section aria-labelledby={titleId} className="grid gap-s">
      <h2 id={titleId} className="text-s font-semibold text-primary">
        {t("sharePage.holders.title", { count: current.length })}
      </h2>
      <Holdings.Grid>
        {sorted.map((holder) => (
          <Holdings.Item key={holder.person.id}>
            <HolderCard holder={holder} />
          </Holdings.Item>
        ))}
      </Holdings.Grid>
    </section>
  );
}
