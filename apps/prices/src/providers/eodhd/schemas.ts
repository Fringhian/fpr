import { currencySchema, dateSchema, decimalSchema } from "@fpr/contracts";
import { z } from "zod";

/** A decimal string above zero. EODHD sends `0` or `"NA"` for a missing price. */
export const positiveDecimalSchema = decimalSchema.refine(
  (value) => !value.startsWith("-") && /[1-9]/.test(value),
  { error: "Expected a price above zero" },
);

/** One listing of `GET /search/{query}`. */
export const searchItemSchema = z.object({
  Code: z.string().trim().min(1),
  Exchange: z.string().trim().min(1),
  Name: z.string().trim().min(1),
  Type: z.string().nullish(),
  Country: z.string().nullish(),
  Currency: currencySchema,
  ISIN: z.string().nullish(),
  isPrimary: z.boolean().nullish(),
});

/** One quote of `GET /real-time/{symbol}`. `timestamp` is in Unix seconds. */
export const quoteSchema = z.object({
  code: z.string().min(1),
  timestamp: z.string().regex(/^\d+$/),
  close: positiveDecimalSchema,
});

/** One trading day of `GET /eod/{symbol}`. A close at or below zero is skipped by name. */
export const eodRowSchema = z.object({
  date: dateSchema,
  close: decimalSchema,
});
