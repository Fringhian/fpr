import type {
  Decimal,
  IsoDate,
  Language,
  ShareManualBody,
} from "@fpr/contracts";
import { isPositive, parseAmount } from "../../../lib/amount";
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

/** The value of one unit typed, read in the person's language, or `null` unless it is above zero. */
export function priceOf(text: string, language: Language): Decimal | null {
  const price = parseAmount(text, language);
  return price !== null && isPositive(price) ? price : null;
}

/** The draft as the API takes it, or `null` while a field is wrong. */
export function bodyOf(
  draft: ShareDraft,
  today: IsoDate,
  language: Language,
): ShareManualBody | null {
  const isin = isinIn(draft.isin);
  const name = draft.name.trim();
  const price = priceOf(draft.price, language);
  if (isin === null || name === "" || price === null) {
    return null;
  }
  return { isin, name, priceEur: price, at: momentOfDay(draft.day, today) };
}
