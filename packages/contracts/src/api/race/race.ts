import { z } from "zod";
import { errorMap, signedInRoute } from "../../contract.js";
import { decimalSchema } from "../../decimal.js";
import { periodSchema, unitSchema } from "../../period.js";
import { roles } from "../../roles.js";
import { personSchema } from "../../schemas/person.js";
import { dateSchema, timestampSchema } from "../../schemas/time.js";
import {
  byUnit,
  incompleteSchema,
  lastCloseOnSchema,
  measuredFromSchema,
} from "./fields.js";

/**
 * The race chart: each member's gain since the period's start, in the `unit`
 * the response names: euros, marked `euro`, or percent.
 */
export const raceSchema = byUnit((inUnit) => ({
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
      /** Their gain at each close of the period, oldest first. */
      closes: z.array(
        z.object({ on: dateSchema, gain: inUnit(decimalSchema) }),
      ),
      /**
       * Their gain at each refresh since the last close, oldest first:
       * provisional until the next close, drawn as "today, not final".
       */
      provisional: z.array(
        z.object({ at: timestampSchema, gain: inUnit(decimalSchema) }),
      ),
    }),
  ),
  /** Members with no entry yet: they have no curve. */
  notStarted: z.array(personSchema),
}));

export type Race = z.infer<typeof raceSchema>;

export const getRace = signedInRoute(roles)
  .route({
    method: "GET",
    path: "/race",
    summary: "Every member's gain at each close, then provisional points",
  })
  .input(z.object({ period: periodSchema, unit: unitSchema }))
  .output(raceSchema)
  .errors(errorMap("invalid_request"));
