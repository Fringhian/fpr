import { z } from "zod";
import { decimalSchema } from "../decimal.js";

/** A currency's code, such as `EUR`, `USD`, or `GBX` for pence. */
export const currencySchema = z
  .string()
  .regex(/^[A-Z]{3}$/, { error: "Expected a currency code, like EUR" });

export type Currency = z.infer<typeof currencySchema>;

/** The value of one unit of a share, in euros: a decimal string above zero. */
export const priceEurSchema = decimalSchema.refine(
  (value) => !value.startsWith("-") && /[1-9]/.test(value),
  { error: "Expected a price above zero" },
);

/** A percentage as a decimal string: `12.5` is 12.5 %. */
export const percentSchema = decimalSchema.clone();

export type Percent = z.infer<typeof percentSchema>;
