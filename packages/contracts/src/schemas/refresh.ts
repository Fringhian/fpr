import { z } from "zod";
import { timestampSchema } from "./time.js";

/**
 * How an intraday refresh run ended. `succeeded`: every held share was asked
 * for. `partial`: some shares or a batch failed, and the rest was stored.
 * `failed`: nothing could be priced. `skipped`: a scheduled run found the
 * day's call cap reached and sent nothing.
 */
export const refreshStatusSchema = z.enum([
  "succeeded",
  "partial",
  "failed",
  "skipped",
]);

/** A finished intraday refresh run, scheduled or asked for. */
export const refreshRunSchema = z.object({
  trigger: z.enum(["schedule", "request"]),
  status: refreshStatusSchema,
  startedAt: timestampSchema,
  finishedAt: timestampSchema,
  /** The held market shares that got a new intraday price. */
  sharesPriced: z.int().nonnegative(),
  /** The closes stored for held shares missing them. */
  closesStored: z.int().nonnegative(),
  /** The shares whose closes or latest price could not be fetched or converted. */
  failures: z.int().nonnegative(),
});

export type RefreshRun = z.infer<typeof refreshRunSchema>;

/** The intraday refresh's state, kept in memory since the price service started. */
export const refreshStateSchema = z.object({
  /** When the last run, skipped ones included, finished. */
  lastRunAt: timestampSchema.nullable(),
  lastResult: refreshRunSchema.nullable(),
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

export type RefreshState = z.infer<typeof refreshStateSchema>;
