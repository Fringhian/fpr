import { z } from "zod";
import { periods, units } from "./values.js";

export { periods, units };

export const periodSchema = z.enum(periods);

export type Period = z.infer<typeof periodSchema>;

/** The query of a race route that only takes its period: `?period=`. */
export const periodQuerySchema = z.object({ period: periodSchema });

export type PeriodQuery = z.input<typeof periodQuerySchema>;

export const unitSchema = z.enum(units);

export type Unit = z.infer<typeof unitSchema>;
