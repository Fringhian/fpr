import type {
  Decimal,
  PortfolioHoldingHistoryPoint,
  Timestamp,
} from "@fpr/contracts";
import { useQuery } from "@tanstack/react-query";
import Big from "big.js";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../../../components/atoms/card/card";
import { LoadingPlaceholder } from "../../../components/atoms/loading-placeholder/loading-placeholder";
import * as TimelineRow from "../../../components/molecules/timeline-row/timeline-row";
import { useApi } from "../../../lib/api/use-api";
import { formatQuantity } from "../../../lib/format/number";
import { useLanguage } from "../../../lib/i18n";
import { raceDayStart, raceTimeZone } from "../../../lib/race-day";
import { useFlow } from "./flow";
import { useHeldOn } from "./use-before";
import { useDraftText } from "./use-draft-text";

const SHOWN = 4;

type Step = { at: Timestamp; sold: boolean; quantity: Decimal; after: Decimal };

/**
 * The moments the quantity held changed before `beforeMs`, the last few,
 * oldest first: each point of the holding's history that differs from the
 * one before it.
 */
function stepsOf(
  points: readonly PortfolioHoldingHistoryPoint[],
  beforeMs: number,
): Step[] {
  const steps: Step[] = [];
  let held = new Big(0);
  for (const point of points) {
    if (Date.parse(point.at) >= beforeMs) break;
    const now = new Big(point.quantity);
    if (!now.eq(held)) {
      const delta = now.minus(held);
      steps.push({
        at: point.at,
        sold: delta.lt(0),
        quantity: delta.abs().toFixed(),
        after: point.quantity,
      });
    }
    held = now;
  }
  return steps.slice(-SHOWN);
}

function StepRow({ step }: { step: Step }) {
  const { t } = useTranslation();
  const language = useLanguage();

  const kind = step.sold ? "sold" : "bought";
  return (
    <TimelineRow.Root>
      <TimelineRow.Day date={step.at} timeZone={raceTimeZone()} />
      <TimelineRow.Marker icon={TimelineRow.TIMELINE_ICONS[kind]} />
      <TimelineRow.Title>
        {t(`recordChange.overTime.${kind}`, {
          quantity: formatQuantity(step.quantity, language),
        })}
      </TimelineRow.Title>
      <span className="text-s font-semibold tabular-nums">
        {formatQuantity(step.after, language)}
      </span>
    </TimelineRow.Root>
  );
}

/** The sale being recorded: what is left after it, once its quantity is known. */
function SaleRow() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { draft } = useFlow();
  const held = useHeldOn();

  const left =
    held.value !== undefined && draft.amount !== undefined
      ? new Big(held.value).minus(draft.amount).toFixed()
      : undefined;
  return (
    <TimelineRow.Root>
      <TimelineRow.Day date={draft.day} />
      <TimelineRow.Marker icon={TimelineRow.TIMELINE_ICONS.sold} />
      <TimelineRow.Title>
        {t("recordChange.overTime.thisSale")}
      </TimelineRow.Title>
      <span className="text-s font-semibold tabular-nums">
        {left === undefined ? (
          <>
            <span aria-hidden="true">?</span>
            <span className="sr-only">
              {t("recordChange.overTime.unknown")}
            </span>
          </>
        ) : (
          formatQuantity(left, language)
        )}
      </span>
    </TimelineRow.Root>
  );
}

/**
 * A sale's sky panel card: the owner's holding of the share over time, its
 * last changes before the sale's day with what was held after each, then
 * the sale.
 */
export function HoldingOverTime() {
  const { t } = useTranslation();
  const api = useApi();
  const titleId = useId();
  const { owner, draft } = useFlow();
  const text = useDraftText();
  const history = useQuery(
    api.portfolio.holdingHistory.queryOptions({
      input: { userId: owner.id, shareId: draft.shareId ?? "", period: "all" },
      enabled: draft.shareId !== undefined,
    }),
  );

  const who = owner.own ? "you" : "member";
  const steps =
    history.data &&
    stepsOf(history.data.points, Date.parse(raceDayStart(draft.day)));
  return (
    <Card
      aria-labelledby={titleId}
      elevation="rest"
      render={<section />}
      className="grid w-full max-w-[26.25rem] gap-xs p-m"
    >
      <h2 id={titleId} className="text-s font-medium text-secondary">
        {t(`recordChange.overTime.title.${who}`, {
          share: text.share,
          name: owner.name,
        })}
      </h2>
      {history.isError ? (
        <p className="text-s text-secondary">
          {t("recordChange.overTime.failed")}
        </p>
      ) : steps === undefined ? (
        <LoadingPlaceholder className="h-[8rem]">
          {t("recordChange.overTime.loading")}
        </LoadingPlaceholder>
      ) : (
        <TimelineRow.List>
          {steps.map((step) => (
            <StepRow key={step.at} step={step} />
          ))}
          <SaleRow />
        </TimelineRow.List>
      )}
    </Card>
  );
}
