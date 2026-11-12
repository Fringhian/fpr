import { deleteMeAvatar, getUserAvatar, setMeAvatar } from "./avatar.js";
import { getMe, updateMe } from "./profile.js";

export type * from "./avatar.js";
export type * from "./profile.js";

/** The signed-in person's routes, and the pictures of everyone. */
export const meContract = {
  get: getMe,
  update: updateMe,
  setAvatar: setMeAvatar,
  deleteAvatar: deleteMeAvatar,
  getAvatar: getUserAvatar,
};
