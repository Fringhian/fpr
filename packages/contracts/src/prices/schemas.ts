import { z } from "zod";
import { idSchema } from "../schemas/ids.js";
import { pricePointSchema } from "../schemas/share.js";
import { dateSchema } from "../schemas/time.js";

/** A manual share's value point, with the member who last entered it. */
export const pricesValuePointSchema = pricePointSchema.extend({
  /** `null` once that member is deleted. */
  enteredBy: idSchema.nullable(),
});

export type PricesValuePoint = z.infer<typeof pricesValuePointSchema>;

/** A share's history once its closes are stored. */
export const pricesHistorySchema = z.object({
  /** The provider's earliest close, when it starts after a holding: see `prices.md` › History. */
  historyStartsOn: dateSchema.nullable(),
});

export type PricesHistory = z.infer<typeof pricesHistorySchema>;
