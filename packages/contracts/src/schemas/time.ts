import { z } from "zod";

/** A moment: an ISO 8601 date and time with its offset, such as `2026-03-02T17:30:00+01:00`. */
export const timestampSchema = z.iso.datetime({ offset: true });

export type Timestamp = z.infer<typeof timestampSchema>;

/** A calendar day: `YYYY-MM-DD`. */
export const dateSchema = z.iso.date();

export type IsoDate = z.infer<typeof dateSchema>;
