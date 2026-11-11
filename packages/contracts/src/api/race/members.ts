import { z } from "zod";
import { euro } from "../../anonymize.js";
import { errorMap, signedInRoute } from "../../contract.js";
import { decimalSchema } from "../../decimal.js";
import { periodSchema, unitSchema } from "../../period.js";
import { roles } from "../../roles.js";
import { personSchema } from "../../schemas/person.js";
import { shareSummarySchema } from "../../schemas/share.js";
import { dateSchema } from "../../schemas/time.js";
import { byUnit, incompleteSchema, measuredFromSchema } from "./fields.js";

/**
 * Every member, in the `unit` the response names: gains in euros, marked
 * `euro`, or in percent. The web app orders them, the viewer first, then by the
 * name it shows. A member with no entry yet has no first entry, gain, balance,
 * series, or holdings.
 */
export const membersSchema = byUnit((inUnit) => ({
  members: z.array(
    z.object({
      member: personSchema,
      /** The day of their first entry, or `null` when they haven't started. */
      firstEntryOn: dateSchema.nullable(),
      measuredFrom: measuredFromSchema,
      incomplete: incompleteSchema,
      /** Their gain over the period, as of the last close. */
      gain: inUnit(decimalSchema.nullable()),
      /** Their balance at the last close, in euros whatever `unit` asks. */
      balance: euro(decimalSchema.nullable()),
      /** Their gain since the period's start at each close of the period. */
      series: z.array(
        z.object({
          on: dateSchema,
          gain: inUnit(decimalSchema),
        }),
      ),
      /** Their three largest holdings, largest first, with their weight. */
      topHoldings: z
        .array(
          z.object({
            share: shareSummarySchema,
            /** The holding's value in percent of the member's balance. */
            weightPercent: decimalSchema,
          }),
        )
        .max(3),
      /** How many holdings they have, so the web app shows "+2 more". */
      holdingCount: z.int().min(0),
    }),
  ),
}));

export type Members = z.infer<typeof membersSchema>;

export const getMembers = signedInRoute(roles)
  .route({
    method: "GET",
    path: "/members",
    summary: "Every member with their curve, gain, balance and top holdings",
  })
  .input(z.object({ period: periodSchema, unit: unitSchema }))
  .output(membersSchema)
  .errors(errorMap("invalid_request"));
