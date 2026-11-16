import { users } from "@fpr/db";
import { api } from "../implement.js";
import { signedIn } from "../pipeline/index.js";
import { readAvatar, removeAvatar, replaceAvatar } from "./avatar.js";
import { toMe, toPerson } from "./me.js";
import { findMe, updateProfile } from "./profile.js";

/**
 * The handlers of `apiContract.me`: the signed-in person's profile and
 * picture, and everyone's names and pictures. The contracts' roles keep
 * anonymous viewers out of every write and every picture.
 */
export const meRouter = {
  get: api.me.get
    .use(signedIn)
    .handler(async ({ context }) =>
      toMe(await findMe(context.db, context.viewer.id), context.raceTimeZone),
    ),

  update: api.me.update
    .use(signedIn)
    .handler(async ({ context, input }) =>
      toMe(
        await updateProfile(context.db, context.viewer.id, input),
        context.raceTimeZone,
      ),
    ),

  setAvatar: api.me.setAvatar
    .use(signedIn)
    .handler(async ({ context, input }) =>
      toMe(
        await replaceAvatar(context, context.viewer.id, input, context.req.log),
        context.raceTimeZone,
      ),
    ),

  deleteAvatar: api.me.deleteAvatar
    .use(signedIn)
    .handler(async ({ context }) =>
      toMe(
        await removeAvatar(context, context.viewer.id),
        context.raceTimeZone,
      ),
    ),

  getAvatar: api.me.getAvatar
    .use(signedIn)
    .handler(({ context, input }) =>
      readAvatar(context, input.userId, input.v, context.res),
    ),

  people: api.me.people.handler(async ({ context }) =>
    (await users.list(context.db)).map((user) => ({
      ...toPerson(user),
      role: user.role,
    })),
  ),
};
