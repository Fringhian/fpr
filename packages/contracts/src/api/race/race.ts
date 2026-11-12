import { z } from "zod";
import { errorMap, signedInRoute } from "../../contract.js";
import { periodSchema } from "../../period.js";
import { roles } from "../../roles.js";
import {
  incompleteSchema,
  measuredFromSchema,
  memberSeriesPointSchema,
} from "../../schemas/performance.js";
import { personSchema } from "../../schemas/person.js";
import { timestampSchema } from "../../schemas/time.js";
import { lastCloseOnSchema } from "./fields.js";

/**
 * The race chart: each member's balance and gain since the period's start, in
 * euros and in percent. The web app draws the unit the viewer picks; an
 * anonymous viewer gets the percentages alone.
 */
export const raceSchema = z.object({
  lastCloseOn: lastCloseOnSchema,
  /** The time of the latest price stored, or `null` before the first one. */
  latestPricesAt: timestampSchema.nullable(),
  /** `true` while today's refreshes are running: the market is open. */
  refreshesRunning: z.boolean(),
  members: z.array(
    z.object({
      member: personSchema,
      measuredFrom: measuredFromSchema,
      incomplete: incompleteSchema,
      /**
       * Their point at each close of the period, then at each refresh since
       * the last close, oldest first. The refreshes are provisional until the
       * next close, drawn as "today, not final".
       */
      points: z.array(memberSeriesPointSchema),
    }),
  ),
  /** Members with no entry yet: they have no curve. */
  notStarted: z.array(personSchema),
});

export type Race = z.infer<typeof raceSchema>;

export const getRace = signedInRoute(roles)
  .route({
    method: "GET",
    path: "/race",
    summary: "Every member's gain at each close, then provisional points",
  })
  .input(z.object({ period: periodSchema }))
  .output(raceSchema)
  .errors(errorMap("invalid_request"));
