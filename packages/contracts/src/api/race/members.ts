import { z } from "zod";
import { euro } from "../../anonymize.js";
import { errorMap, signedInRoute } from "../../contract.js";
import { decimalSchema } from "../../decimal.js";
import { periodSchema } from "../../period.js";
import { roles } from "../../roles.js";
import { percentSchema } from "../../schemas/money.js";
import {
  firstEntryOnSchema,
  gainSchema,
  incompleteSchema,
  measuredFromSchema,
  memberSeriesPointSchema,
} from "../../schemas/performance.js";
import { personSchema } from "../../schemas/person.js";
import { shareSummarySchema } from "../../schemas/share.js";

/**
 * Every member. The web app orders them, the viewer first, then by the name it
 * shows. A member with no entry yet has no first entry, gain, balance, series,
 * or holdings.
 */
export const membersSchema = z.object({
  members: z.array(
    z.object({
      member: personSchema,
      firstEntryOn: firstEntryOnSchema,
      measuredFrom: measuredFromSchema,
      incomplete: incompleteSchema,
      /** Their gain over the period, as of the last close. */
      gain: gainSchema.nullable(),
      /** Their balance at the last close. */
      balanceEur: euro(decimalSchema.nullable()),
      /** Their balance and gain since the period's start at each close of the period, oldest first. */
      series: z.array(memberSeriesPointSchema),
      /** Their three largest holdings, largest first, with their weight. */
      topHoldings: z
        .array(
          z.object({
            share: shareSummarySchema,
            /** The holding's value in percent of the member's balance. */
            weight: percentSchema,
          }),
        )
        .max(3),
      /** How many holdings they have, so the web app shows "+2 more". */
      holdingCount: z.int().min(0),
    }),
  ),
});

export type Members = z.infer<typeof membersSchema>;

export const getMembers = signedInRoute(roles)
  .route({
    method: "GET",
    path: "/members",
    summary: "Every member with their curve, gain, balance and top holdings",
  })
  .input(z.object({ period: periodSchema }))
  .output(membersSchema)
  .errors(errorMap("invalid_request"));
