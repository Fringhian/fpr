import { z } from "zod";
import { gainSchema } from "../../schemas/performance.js";
import { shareSummarySchema } from "../../schemas/share.js";
import { dateSchema } from "../../schemas/time.js";

/** The day of the last close: leaderboards and gains are as of it. */
export const lastCloseOnSchema = dateSchema;

/**
 * The member's holding with the largest gain over the period, in percent, with
 * that gain, or `null` when they held no priced share over it.
 */
export const bestHoldingSchema = z
  .object({
    share: shareSummarySchema,
    gain: gainSchema,
  })
  .nullable();
