import { z } from "zod";
import { euro } from "../../anonymize.js";
import { errorMap, signedInRoute } from "../../contract.js";
import { decimalSchema } from "../../decimal.js";
import { periodSchema, unitSchema } from "../../period.js";
import { roles } from "../../roles.js";
import { personSchema } from "../../schemas/person.js";
import { shareSummarySchema } from "../../schemas/share.js";
import {
  bestHoldingSchema,
  byUnit,
  incompleteSchema,
  lastCloseOnSchema,
  measuredFromSchema,
} from "./fields.js";

/** `balance`: the standings by balance. `gain`: by gain over the period. */
export const leaderboardBoards = ["balance", "gain"] as const;

export const leaderboardBoardSchema = z.enum(leaderboardBoards);

export type LeaderboardBoard = z.infer<typeof leaderboardBoardSchema>;

/** Members with no entry yet, listed under the standings as not started. */
const notStartedSchema = z.array(personSchema);

/**
 * The balance standings, highest first, as of the last close. The balance is
 * in euros whatever `unit` asks; for an anonymous viewer the anonymizer
 * replaces it, so they see the ranks without amounts.
 */
const balanceLeaderboardSchema = z.object({
  board: z.literal("balance"),
  lastCloseOn: lastCloseOnSchema,
  rows: z.array(
    z.object({
      member: personSchema,
      balance: euro(decimalSchema),
      incomplete: incompleteSchema,
      bestHolding: bestHoldingSchema,
    }),
  ),
  notStarted: notStartedSchema,
});

/**
 * The gain standings over the period, highest first, as of the last close, in
 * the `unit` the response names: euros, marked `euro`, or percent.
 */
const gainLeaderboardSchema = byUnit((inUnit) => ({
  board: z.literal("gain"),
  lastCloseOn: lastCloseOnSchema,
  rows: z.array(
    z.object({
      member: personSchema,
      gain: inUnit(decimalSchema),
      measuredFrom: measuredFromSchema,
      incomplete: incompleteSchema,
      bestHolding: bestHoldingSchema,
    }),
  ),
  notStarted: notStartedSchema,
}));

/** A leaderboard, told apart by `board`, then for `gain` by `unit`. */
export const leaderboardSchema = z.discriminatedUnion("board", [
  balanceLeaderboardSchema,
  gainLeaderboardSchema,
]);

export type Leaderboard = z.infer<typeof leaderboardSchema>;

export const getLeaderboard = signedInRoute(roles)
  .route({
    method: "GET",
    path: "/leaderboards/{board}",
    summary: "The standings by balance, or by gain over a period",
  })
  .input(
    z.object({
      board: leaderboardBoardSchema,
      /** The span of `gain`, and of each row's best holding. */
      period: periodSchema,
      /** How `gain` is expressed. `balance` is in euros whatever it says. */
      unit: unitSchema,
    }),
  )
  .output(leaderboardSchema)
  .errors(errorMap("invalid_request"));

/**
 * The shares held in the race at the last close, ranked by their change over
 * the period, highest first. A share with no price yet is left out. Share
 * prices are market data, so the change stays as it is for every viewer.
 */
export const shareLeaderboardSchema = z.object({
  lastCloseOn: lastCloseOnSchema,
  rows: z.array(
    z.object({
      share: shareSummarySchema,
      changePercent: decimalSchema,
    }),
  ),
});

export type ShareLeaderboard = z.infer<typeof shareLeaderboardSchema>;

export const getShareLeaderboard = signedInRoute(roles)
  .route({
    method: "GET",
    path: "/leaderboards/shares",
    summary: "The shares held in the race, ranked by their change",
  })
  .input(z.object({ period: periodSchema }))
  .output(shareLeaderboardSchema)
  .errors(errorMap("invalid_request"));
