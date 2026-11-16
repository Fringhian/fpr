import { api } from "../implement.js";
import { signedIn } from "../pipeline/index.js";
import { readLeaderboard, readShareLeaderboard } from "./leaderboards.js";
import { readMembers } from "./members.js";
import { readRace } from "./race.js";

/**
 * The handlers of `apiContract.race`: leaderboards, members, and the race
 * chart, all from the balance series.
 */
export const raceRouter = {
  leaderboard: api.race.leaderboard
    .use(signedIn)
    .handler(({ context, input }) =>
      readLeaderboard(context, context.viewer, input),
    ),

  shareLeaderboard: api.race.shareLeaderboard
    .use(signedIn)
    .handler(({ context, input }) => readShareLeaderboard(context, input)),

  members: api.race.members
    .use(signedIn)
    .handler(({ context, input }) => readMembers(context, input)),

  race: api.race.race
    .use(signedIn)
    .handler(({ context, input }) => readRace(context, input)),
};
