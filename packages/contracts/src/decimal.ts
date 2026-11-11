import { z } from "zod";

/**
 * A plain decimal: an optional minus sign, digits with no leading zero, and an
 * optional fractional part. No plus sign, exponent, separator, whitespace, or
 * negative zero. Trailing zeros are kept, as Postgres `numeric` returns them.
 */
export const decimalPattern = /^(?!-0(?:\.0+)?$)-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

/** A quantity, price, or amount: a Postgres `numeric` as a decimal string. */
export const decimalSchema = z
  .string()
  .regex(decimalPattern, { error: "Expected a decimal string, like 74.328" });

export type Decimal = z.infer<typeof decimalSchema>;
