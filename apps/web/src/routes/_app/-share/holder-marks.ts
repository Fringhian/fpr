import type { Id, IsoDate, Language, ShareHolder } from "@fpr/contracts";
import type { TFunction } from "i18next";
import type { ChartMark } from "../../../components/molecules/chart/chart";
import { formatPercent } from "../../../lib/format/money";
import { formatQuantity } from "../../../lib/format/number";
import { type Look, lookOf } from "../../../lib/look";
import { raceDayOf } from "../../../lib/race-day";

/** A holder and their purchases and sales on the chart. */
export type HolderMarks = { id: Id; look: Look; marks: ChartMark[] };

/**
 * Each holder's purchases and sales from `from`, the chart's first day, as
 * marks on the share's line in their colour: “Sam bought 40”. An anonymous
 * viewer, who reads no quantities, receives each change as its weight in the
 * holder's balance, signed like the change: “Sam sold 12.5% of their
 * portfolio”. A holder with no change in the chart's days is left out.
 */
export function holderMarks(
  holders: readonly ShareHolder[],
  from: IsoDate | undefined,
  {
    anonymous,
    t,
    language,
  }: { anonymous: boolean; t: TFunction; language: Language },
): HolderMarks[] {
  return holders.flatMap(({ person, changes }) => {
    const look = lookOf(person);
    const marks = changes.flatMap((change): ChartMark[] => {
      const day = raceDayOf(change.effectiveAt);
      if (from === undefined || day < from) return [];
      const sold = change.quantityDelta.startsWith("-");
      const amount = change.quantityDelta.replace(/^-/, "");
      const label = t(`sharePage.marks.${sold ? "sold" : "bought"}`, {
        name: look.name,
        quantity: anonymous
          ? t("sharePage.marks.weight", {
              weight: formatPercent(amount, language),
            })
          : formatQuantity(amount, language),
      });
      return [
        { day, direction: sold ? "down" : "up", color: look.color, label },
      ];
    });
    return marks.length > 0 ? [{ id: person.id, look, marks }] : [];
  });
}
