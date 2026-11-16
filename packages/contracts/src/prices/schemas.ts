import { z } from "zod";
import { idSchema } from "../schemas/ids.js";
import { pricePointSchema } from "../schemas/share.js";
import { dateSchema, timestampSchema } from "../schemas/time.js";

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

/**
 * How an intraday refresh run ended. `succeeded`: every held share was asked
 * for. `partial`: some shares or a batch failed, and the rest was stored.
 * `failed`: nothing could be priced. `skipped`: a scheduled run found the
 * day's call cap reached and sent nothing.
 */
export const pricesRefreshStatusSchema = z.enum([
  "succeeded",
  "partial",
  "failed",
  "skipped",
]);

/** A finished intraday refresh run, scheduled or asked for. */
export const pricesRefreshRunSchema = z.object({
  trigger: z.enum(["schedule", "request"]),
  status: pricesRefreshStatusSchema,
  startedAt: timestampSchema,
  finishedAt: timestampSchema,
  /** The held market shares that got a new intraday price. */
  sharesPriced: z.int().nonnegative(),
  /** The closes stored for held shares missing them. */
  closesStored: z.int().nonnegative(),
  /** The shares whose closes or latest price could not be fetched or converted. */
  failures: z.int().nonnegative(),
});

export type PricesRefreshRun = z.infer<typeof pricesRefreshRunSchema>;

/** The intraday refresh's state, kept in memory since the service started. */
export const pricesRefreshStateSchema = z.object({
  /** When the last run, skipped ones included, finished. */
  lastRunAt: timestampSchema.nullable(),
  lastResult: pricesRefreshRunSchema.nullable(),
  /** The next scheduled run. */
  nextRunAt: timestampSchema.nullable(),
  /** The runs that sent requests today in `RACE_TIMEZONE`, scheduled or asked for. */
  runsToday: z.int().nonnegative(),
  /** The provider's daily call cap, `PROVIDER_DAILY_CALL_LIMIT`, and the day's count. */
  cap: z.object({
    callLimit: z.int().positive(),
    callsToday: z.int().nonnegative(),
    callsLeft: z.int().nonnegative(),
  }),
});

export type PricesRefreshState = z.infer<typeof pricesRefreshStateSchema>;
