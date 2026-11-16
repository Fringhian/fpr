import type { ShareListItem } from "@fpr/contracts";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import * as ShareCard from "../../../components/molecules/share-card/share-card";
import * as Holdings from "../../../components/organisms/holdings/holdings";
import { cn } from "../../../lib/cn";
import type { GainUnit } from "../../../lib/gain";
import { lookOf } from "../../../lib/look";
import { pricePoints } from "../../../lib/series";

function Card({
  share,
  unit,
  size,
}: {
  share: ShareListItem;
  unit: GainUnit;
  size: "m" | "s";
}) {
  const curve = useMemo(() => pricePoints(share.series), [share.series]);
  const holders = useMemo(
    () => share.holders.map((person) => ({ id: person.id, ...lookOf(person) })),
    [share.holders],
  );

  return (
    <ShareCard.Basic
      size={size}
      name={share.name}
      kind={share.kind}
      isin={share.isin}
      symbol={share.symbol}
      latestPrice={share.latestPrice}
      change={share.change}
      curve={curve}
      unit={unit}
      holders={holders}
      link={<Link to="/shares/$shareId" params={{ shareId: share.id }} />}
    />
  );
}

/** One group of cards under its heading. */
function Group({
  title,
  muted = false,
  className,
  children,
}: {
  title: string;
  muted?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="grid gap-s">
      <h2
        id={titleId}
        className={cn("text-s font-semibold", muted ? "text-secondary" : null)}
      >
        {title}
      </h2>
      <Holdings.Grid className={className}>{children}</Holdings.Grid>
    </section>
  );
}

/**
 * The shares found, in the API's order: the ones held in the race first,
 * most holders first, on whole cards, then the ones nobody holds on small
 * cards, more to a row.
 */
export function ShareGroups({
  shares,
  unit,
}: {
  shares: readonly ShareListItem[];
  unit: GainUnit;
}) {
  const { t } = useTranslation();

  const held = shares.filter((share) => share.holders.length > 0);
  const others = shares.filter((share) => share.holders.length === 0);

  return (
    <>
      {held.length > 0 ? (
        <Group title={t("sharesPage.held")}>
          {held.map((share) => (
            <Holdings.Item key={share.id}>
              <Card share={share} unit={unit} size="m" />
            </Holdings.Item>
          ))}
        </Group>
      ) : null}
      {others.length > 0 ? (
        <Group
          title={t("sharesPage.notHeld")}
          muted
          className={cn(
            "",
            "grid-cols-1",
            "tablet:grid-cols-2",
            "desktop:grid-cols-[repeat(auto-fill,minmax(13rem,1fr))]",
          )}
        >
          {others.map((share) => (
            <Holdings.Item key={share.id}>
              <Card share={share} unit={unit} size="s" />
            </Holdings.Item>
          ))}
        </Group>
      ) : null}
    </>
  );
}
