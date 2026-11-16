import type { Id, IsoDate, Language, ShareHolder } from "@fpr/contracts";
import type { TFunction } from "i18next";
import type { ChartMark } from "../../../components/molecules/chart/chart";
import { formatQuantity } from "../../../lib/format/number";
import { type Look, lookOf } from "../../../lib/look";
import { raceDayOf } from "../../../lib/race-day";

/** A holder and their purchases and sales on the chart. */
export type HolderMarks = { id: Id; look: Look; marks: ChartMark[] };

/**
 * Each holder's purchases and sales from `from`, the chart's first day, as
 * marks on the share's line in their colour: “Sam bought 40”. An anonymous
 * viewer, who reads no quantities, reads “Sam changed their holding”. A
 * holder with no change in the chart's days is left out.
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
      const quantity = formatQuantity(
        change.quantityDelta.replace(/^-/, ""),
        language,
      );
      const label = anonymous
        ? t("sharePage.marks.changed", { name: look.name })
        : t(`sharePage.marks.${sold ? "sold" : "bought"}`, {
            name: look.name,
            quantity,
          });
      return [
        { day, direction: sold ? "down" : "up", color: look.color, label },
      ];
    });
    return marks.length > 0 ? [{ id: person.id, look, marks }] : [];
  });
}
