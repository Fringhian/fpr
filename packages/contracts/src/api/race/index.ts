import { getLeaderboard, getShareLeaderboard } from "./leaderboards.js";
import { getMembers } from "./members.js";
import { getRace } from "./race.js";

export {
  getLeaderboard,
  getShareLeaderboard,
  type Leaderboard,
  type LeaderboardBoard,
  type LeaderboardQuery,
  leaderboardBoardSchema,
  leaderboardBoards,
  leaderboardQuerySchema,
  leaderboardSchema,
  type ShareLeaderboard,
  shareLeaderboardSchema,
} from "./leaderboards.js";
export { getMembers, type Members, membersSchema } from "./members.js";
export { getRace, type Race, raceSchema } from "./race.js";

/** Leaderboards, members, and the race chart. */
export const raceContract = {
  leaderboard: getLeaderboard,
  shareLeaderboard: getShareLeaderboard,
  members: getMembers,
  race: getRace,
};
