import { z } from "zod";
import { decimalSchema } from "../decimal.js";
import { idSchema } from "./ids.js";
import { timestampSchema } from "./time.js";

/** An ISIN: two letters, nine letters or digits, and a check digit. */
export const isinSchema = z
  .string()
  .regex(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/, { error: "Expected an ISIN" });

/** `market`: priced by the provider. `manual`: priced by value points members enter. */
export const shareKinds = ["market", "manual"] as const;

export const shareKindSchema = z.enum(shareKinds);

export type ShareKind = z.infer<typeof shareKindSchema>;

/** A share as every list shows it. */
export const shareSummarySchema = z.object({
  id: idSchema,
  isin: isinSchema,
  name: z.string().min(1),
  kind: shareKindSchema,
  /** The provider's symbol for the listing FPR prices, or `null` for a manual share. */
  symbol: z.string().nullable(),
});

export type ShareSummary = z.infer<typeof shareSummarySchema>;

/**
 * What one unit of a share was worth at a moment, in euros. Share prices are
 * market data, so the anonymizer keeps them.
 */
export const pricePointSchema = z.object({
  at: timestampSchema,
  priceEur: decimalSchema,
});

export type PricePoint = z.infer<typeof pricePointSchema>;
