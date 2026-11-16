import { deleteMeAvatar, getUserAvatar, setMeAvatar } from "./avatar.js";
import { getPeople } from "./people.js";
import { getMe, updateMe } from "./profile.js";

export type * from "./avatar.js";
export type * from "./people.js";
export type * from "./profile.js";

/** The signed-in person's routes, and everyone's names, colours, and pictures. */
export const meContract = {
  get: getMe,
  update: updateMe,
  setAvatar: setMeAvatar,
  deleteAvatar: deleteMeAvatar,
  getAvatar: getUserAvatar,
  people: getPeople,
};
