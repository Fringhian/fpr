import type { Gain, Period, Person } from "@fpr/contracts";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { LoadingPlaceholder } from "../../../components/atoms/loading-placeholder/loading-placeholder";
import * as FocusPanel from "../../../components/organisms/focus-panel/focus-panel";
import { useErrorText } from "../../../lib/api/errors";
import { livePrices } from "../../../lib/api/query-client";
import { useApi } from "../../../lib/api/use-api";
import { cn } from "../../../lib/cn";
import type { GainUnit } from "../../../lib/gain";
import { lookOf } from "../../../lib/look";
import { moversOf } from "./movers";

/** What moved the member's period, once their portfolio loads. */
function Movers({
  member,
  you,
  period,
  unit,
}: {
  member: Person;
  you: boolean;
  period: Period;
  unit: GainUnit;
}) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const api = useApi();
  const portfolio = useQuery(
    api.portfolio.get.queryOptions({
      input: { userId: member.id, period },
      ...livePrices,
    }),
  );

  if (portfolio.data !== undefined) {
    return (
      <FocusPanel.Movers
        you={you}
        movers={moversOf(portfolio.data)}
        unit={unit}
      />
    );
  }
  return portfolio.isError ? (
    <p className="text-s text-secondary">{errorText(portfolio.error)}</p>
  ) : (
    <LoadingPlaceholder>{t("moverRow.loading")}</LoadingPlaceholder>
  );
}

/** The panel's card: lifted beside the race on desktop, on its outline under it. */
const CARD = cn(
  "",
  "shadow-outline",
  "tablet:shadow-outline",
  "desktop:shadow-rest",
);

/** The panel's place until the focused member's standing loads. */
export function HomeFocusLoading() {
  return (
    <FocusPanel.Root className={CARD}>
      <LoadingPlaceholder
        className={cn("", "h-[15rem]", "tablet:h-[15rem]", "desktop:h-full")}
      />
    </FocusPanel.Root>
  );
}

/**
 * The focused member's panel: their gain over the period, what moved it, and
 * a link to their page, or to the viewer's portfolio. “Back to you” shows
 * when the viewer is in the race and looks at someone else.
 */
export function HomeFocus({
  member,
  gain,
  you,
  backToYou,
  period,
  unit,
}: {
  member: Person;
  /** Their gain over the period, from the standings. */
  gain: Gain;
  you: boolean;
  backToYou: boolean;
  period: Period;
  unit: GainUnit;
}) {
  const { t } = useTranslation();
  const titleId = useId();

  const look = lookOf(member);
  const back = (
    <Link
      to="/"
      search={(previous) => ({ ...previous, focus: undefined })}
      replace
      resetScroll={false}
    />
  );
  const page = you ? (
    <Link to="/portfolio" />
  ) : (
    <Link to="/members/$userId" params={{ userId: member.id }} />
  );

  return (
    <FocusPanel.Root aria-labelledby={titleId} className={CARD}>
      <FocusPanel.Header
        titleId={titleId}
        member={look}
        you={you}
        period={period}
        backLink={backToYou ? { render: back } : null}
      />
      <FocusPanel.Gain gain={gain} unit={unit} />
      <Movers member={member} you={you} period={period} unit={unit} />
      <FocusPanel.PageLink render={page}>
        {you
          ? t("focusPanel.open.you")
          : t("focusPanel.open.them", { name: look.name })}
      </FocusPanel.PageLink>
    </FocusPanel.Root>
  );
}
