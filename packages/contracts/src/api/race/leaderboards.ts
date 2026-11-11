import { z } from "zod";
import { euro } from "../../anonymize.js";
import { errorMap, signedInRoute } from "../../contract.js";
import { decimalSchema } from "../../decimal.js";
import { periodSchema, unitSchema } from "../../period.js";
import { roles } from "../../roles.js";
import {
  gainSchema,
  incompleteSchema,
  measuredFromSchema,
  priceChangeSchema,
} from "../../schemas/performance.js";
import { personSchema } from "../../schemas/person.js";
import { shareSummarySchema } from "../../schemas/share.js";
import { bestHoldingSchema, lastCloseOnSchema } from "./fields.js";

/** `balance`: the standings by balance. `gain`: by gain over the period. */
export const leaderboardBoards = ["balance", "gain"] as const;

export const leaderboardBoardSchema = z.enum(leaderboardBoards);

export type LeaderboardBoard = z.infer<typeof leaderboardBoardSchema>;

const board = leaderboardBoardSchema.enum;

/** Members with no entry yet, listed under the standings as not started. */
const notStartedSchema = z.array(personSchema);

/**
 * The balance standings, highest first, as of the last close. A balance has no
 * percentage: for an anonymous viewer the anonymizer removes it, so they see
 * the ranks without amounts.
 */
const balanceLeaderboardSchema = z.object({
  board: z.literal(board.balance),
  lastCloseOn: lastCloseOnSchema,
  rows: z.array(
    z.object({
      member: personSchema,
      balanceEur: euro(decimalSchema),
      incomplete: incompleteSchema,
      bestHolding: bestHoldingSchema,
    }),
  ),
  notStarted: notStartedSchema,
});

/**
 * The gain standings over the period, highest first, as of the last close,
 * ranked by the gain in the `unit` the response names. Each gain carries both
 * euros and percent. An anonymous viewer is ranked in `percent` whatever the
 * request asks.
 */
const gainLeaderboardSchema = z.object({
  board: z.literal(board.gain),
  unit: unitSchema,
  lastCloseOn: lastCloseOnSchema,
  rows: z.array(
    z.object({
      member: personSchema,
      gain: gainSchema,
      measuredFrom: measuredFromSchema,
      incomplete: incompleteSchema,
      bestHolding: bestHoldingSchema,
    }),
  ),
  notStarted: notStartedSchema,
});

/** A leaderboard, told apart by `board`. */
export const leaderboardSchema = z.discriminatedUnion("board", [
  balanceLeaderboardSchema,
  gainLeaderboardSchema,
]);

export type Leaderboard = z.infer<typeof leaderboardSchema>;

/** `GET /leaderboards/{board}?period=&unit=`. */
export const leaderboardQuerySchema = z.object({
  board: leaderboardBoardSchema,
  /** The span of `gain`, and of each row's best holding. */
  period: periodSchema,
  /**
   * What the `gain` board ranks by, `eur` when left out. The `balance` board
   * ranks by balance whatever it says.
   */
  unit: unitSchema.default(unitSchema.enum.eur),
});

export type LeaderboardQuery = z.input<typeof leaderboardQuerySchema>;

export const getLeaderboard = signedInRoute(roles)
  .route({
    method: "GET",
    path: "/leaderboards/{board}",
    summary: "The standings by balance, or by gain over a period",
  })
  .input(leaderboardQuerySchema)
  .output(leaderboardSchema)
  .errors(errorMap("invalid_request"));

/**
 * The shares held in the race at the last close, ranked by their change in
 * percent over the period, highest first. A share with no price yet is left
 * out. Share prices are market data, so the change stays as it is for every
 * viewer.
 */
export const shareLeaderboardSchema = z.object({
  lastCloseOn: lastCloseOnSchema,
  rows: z.array(
    z.object({
      share: shareSummarySchema,
      change: priceChangeSchema,
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
