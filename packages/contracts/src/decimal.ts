import { z } from "zod";
import { decimalPattern, enteredDecimalDigits } from "./values.js";

export { decimalPattern };

/** A quantity, price, or amount: a Postgres `numeric` as a decimal string. */
export const decimalSchema = z
  .string()
  .regex(decimalPattern, { error: "Expected a decimal string, like 74.328" });

export type Decimal = z.infer<typeof decimalSchema>;

/**
 * A decimal a person enters, which also has at most `enteredDecimalDigits`.
 * Values FPR computes, such as balances and converted prices, have no bound.
 */
export function entered<T extends z.ZodType<string>>(schema: T): T {
  const { integer, fraction } = enteredDecimalDigits;
  return schema.refine(
    (value) => {
      const [whole = "", part = ""] = value.replace("-", "").split(".");
      return whole.length <= integer && part.length <= fraction;
    },
    {
      error: `Expected at most ${integer} digits before the point and ${fraction} after`,
    },
  );
}
