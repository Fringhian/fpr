import { getLeaderboard, getShareLeaderboard } from "./leaderboards.js";
import { getMembers } from "./members.js";
import { getRace } from "./race.js";

export type * from "./leaderboards.js";
export type * from "./members.js";
export type * from "./race.js";

/** Leaderboards, members, and the race chart. */
export const raceContract = {
  leaderboard: getLeaderboard,
  shareLeaderboard: getShareLeaderboard,
  members: getMembers,
  race: getRace,
};
