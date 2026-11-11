import { z } from "zod";

/** The span a gain is measured over. */
export const periods = ["1D", "1W", "1M", "3M", "YTD", "all"] as const;

export const periodSchema = z.enum(periods);

export type Period = z.infer<typeof periodSchema>;

/** How a gain is expressed. */
export const units = ["eur", "percent"] as const;

export const unitSchema = z.enum(units);

export type Unit = z.infer<typeof unitSchema>;
