import { z } from "zod";
import { earliestEntryDay } from "../values.js";

/** A moment: an ISO 8601 date and time with its offset, such as `2026-03-02T17:30:00+01:00`. */
export const timestampSchema = z.iso.datetime({ offset: true });

export type Timestamp = z.infer<typeof timestampSchema>;

const earliestEntryTime = Date.parse(`${earliestEntryDay}T00:00:00Z`);

/**
 * The moment of a share change, cash balance, or value point a person
 * enters: on or after `earliestEntryDay`, so one entry can't stretch every
 * member's series over centuries. Its future check is the handler's.
 */
export const entryMomentSchema = timestampSchema.refine(
  (at) => Date.parse(at) >= earliestEntryTime,
  { error: `Expected a moment on or after ${earliestEntryDay}` },
);

/** A calendar day: `YYYY-MM-DD`. */
export const dateSchema = z.iso.date();

export type IsoDate = z.infer<typeof dateSchema>;
