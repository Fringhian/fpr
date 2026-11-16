import type { IsoDate, Language, ShareManualBody } from "@fpr/contracts";
import { priceIn } from "../../../lib/amount";
import { isinIn } from "../../../lib/isin";
import { momentOfDay } from "../../../lib/race-day";

/** Create a manual share's fields as typed. */
export type ShareDraft = {
  isin: string;
  name: string;
  /** The value of one unit, in euros, as typed. */
  price: string;
  day: IsoDate;
};

/** The draft as the API takes it, or `null` while a field is wrong. */
export function bodyOf(
  draft: ShareDraft,
  today: IsoDate,
  language: Language,
): ShareManualBody | null {
  const isin = isinIn(draft.isin);
  const name = draft.name.trim();
  const price = priceIn(draft.price, language);
  if (isin === null || name === "" || price === null) {
    return null;
  }
  return { isin, name, priceEur: price, at: momentOfDay(draft.day, today) };
}
