import { z } from "zod";
import { decimalPattern } from "./values.js";

export { decimalPattern };

/** A quantity, price, or amount: a Postgres `numeric` as a decimal string. */
export const decimalSchema = z
  .string()
  .regex(decimalPattern, { error: "Expected a decimal string, like 74.328" });

export type Decimal = z.infer<typeof decimalSchema>;
