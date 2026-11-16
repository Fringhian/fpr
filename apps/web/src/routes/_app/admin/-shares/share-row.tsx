import type { AdminShare } from "@fpr/contracts";
import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "../../../../components/atoms/badge/badge";
import { Button } from "../../../../components/atoms/button/button";
import { Icon } from "../../../../components/foundations/icon/icon";
import { PictureStack } from "../../../../components/molecules/picture-stack/picture-stack";
import { cn } from "../../../../lib/cn";
import { formatMoney } from "../../../../lib/format/money";
import { useLanguage } from "../../../../lib/i18n";
import { lookOf } from "../../../../lib/look";
import { usePriceTime } from "../../../../lib/price-time";
import { raceTimeZone } from "../../../../lib/race-day";
import {
  actionOf,
  badgeOf,
  type ShareDialog,
  type ShareGroup,
} from "./shares-model";

/**
 * The list the rows go in. Its columns have one width in every group, so
 * badges, prices, holders and actions line up down the page.
 */
export function ShareList({ className, ...props }: ComponentProps<"ul">) {
  return (
    <ul
      {...props}
      className={cn(
        "m-0 grid list-none gap-x-[0.875rem] gap-y-s p-0 font-sans",
        "grid-cols-[minmax(0,1fr)_auto_auto_auto]",
        "tablet:grid-cols-[minmax(0,1fr)_8.5rem_5.5rem_9rem]",
        "desktop:grid-cols-[minmax(0,1fr)_8.5rem_13rem_6.5rem_9rem]",
        className,
      )}
    />
  );
}

/** The latest price and its time, “€40.10 · close of 2 Mar”, or that it has none. */
function PriceDetail({ share }: { share: AdminShare }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const priceTime = usePriceTime();

  const { latestPrice } = share;
  return latestPrice === null
    ? t("adminShares.neverPriced")
    : `${formatMoney(latestPrice.priceEur, language)} · ${priceTime(latestPrice, raceTimeZone())}`;
}

/** The ISIN and the symbol, then the price on a line under them on tablet, or in its own column on desktop. */
function Meta({ share }: { share: AdminShare }) {
  return (
    <span
      className={cn(
        "text-secondary",
        "col-1 row-2 flex flex-col",
        "tablet:col-1 tablet:row-2 tablet:flex",
        "desktop:contents",
      )}
    >
      <span className="col-1 row-2 truncate text-xs">
        {share.symbol === null ? share.isin : `${share.isin} · ${share.symbol}`}
      </span>
      <span
        className={cn(
          "tabular-nums",
          "col-auto row-auto text-xs",
          "tablet:col-auto tablet:row-auto tablet:text-xs",
          "desktop:col-3 desktop:row-[1/span_2] desktop:text-s",
        )}
      >
        <PriceDetail share={share} />
      </span>
    </span>
  );
}

/** The row's action: Make manual or Delete for the admin, else the caret of the share's page. */
function Action({
  share,
  group,
  onAct,
}: {
  share: AdminShare;
  group: ShareGroup;
  onAct: ((dialog: ShareDialog) => void) | undefined;
}) {
  const { t } = useTranslation();

  const kind = onAct === undefined ? null : actionOf(group, share);
  return kind === null ? (
    <Icon
      icon={CaretRightIcon}
      size="s"
      className="justify-self-end text-secondary"
    />
  ) : (
    <Button
      size="s"
      intent={kind === "delete" ? "danger" : "secondary"}
      onClick={() => onAct?.({ kind, share })}
      className="relative justify-self-end"
    >
      {t(`adminShares.actions.${kind}`)}
    </Button>
  );
}

/**
 * A share in its group: name, ISIN and symbol, its badge, its latest price
 * and time, its holders, and the admin's action. The name links to the
 * share's page over the whole row; the action sits above that link.
 */
export function ShareRow({
  share,
  group,
  onAct,
}: {
  share: AdminShare;
  group: ShareGroup;
  onAct: ((dialog: ShareDialog) => void) | undefined;
}) {
  const { t } = useTranslation();

  return (
    <li className="relative col-span-full grid grid-cols-subgrid items-center rounded-card bg-surface px-[0.875rem] py-[0.625rem] shadow-outline">
      <Link
        to="/shares/$shareId"
        params={{ shareId: share.id }}
        className={cn(
          "col-1 row-1 truncate rounded-card text-s font-semibold text-primary no-underline after:absolute after:inset-0 after:rounded-card",
          "",
          "",
          "",
          "hover:underline",
          "focus-visible:after:focus-ring",
        )}
      >
        {share.name}
      </Link>
      <Meta share={share} />
      <Badge
        state={badgeOf(group, share)}
        className="col-2 row-[1/span_2] justify-self-start"
      />
      <PictureStack
        people={share.holders.map((holder) => ({
          id: holder.id,
          ...lookOf(holder),
        }))}
        label={t("shareCard.holders")}
        className={cn(
          "row-[1/span_2]",
          "col-3",
          "tablet:col-3",
          "desktop:col-4",
        )}
      />
      <span
        className={cn(
          "grid row-[1/span_2]",
          "col-4",
          "tablet:col-4",
          "desktop:col-5",
        )}
      >
        <Action share={share} group={group} onAct={onAct} />
      </span>
    </li>
  );
}
