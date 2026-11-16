import { api } from "../implement.js";
import { signedIn } from "../pipeline/index.js";
import { readAvatar, removeAvatar, replaceAvatar } from "./avatar.js";
import { toMe } from "./me.js";
import { findMe, updateProfile } from "./profile.js";

/**
 * The handlers of `apiContract.me`: the signed-in person's profile and
 * picture, and everyone's pictures. The contracts' roles keep anonymous
 * viewers out of every write and every picture.
 */
export const meRouter = {
  get: api.me.get
    .use(signedIn)
    .handler(async ({ context }) =>
      toMe(await findMe(context.db, context.viewer.id)),
    ),

  update: api.me.update
    .use(signedIn)
    .handler(async ({ context, input }) =>
      toMe(await updateProfile(context.db, context.viewer.id, input)),
    ),

  setAvatar: api.me.setAvatar
    .use(signedIn)
    .handler(async ({ context, input }) =>
      toMe(
        await replaceAvatar(context, context.viewer.id, input, context.req.log),
      ),
    ),

  deleteAvatar: api.me.deleteAvatar
    .use(signedIn)
    .handler(async ({ context }) =>
      toMe(await removeAvatar(context, context.viewer.id)),
    ),

  getAvatar: api.me.getAvatar
    .use(signedIn)
    .handler(({ context, input }) =>
      readAvatar(context, input.userId, input.v, context.res),
    ),
};
