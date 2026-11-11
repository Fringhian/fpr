import { deleteMeAvatar, getUserAvatar, setMeAvatar } from "./avatar.js";
import { getMe, updateMe } from "./profile.js";

export {
  type AvatarMediaType,
  avatarMaxBytes,
  avatarMediaTypes,
  avatarSchema,
  avatarUploadSchema,
  deleteMeAvatar,
  getUserAvatar,
  setMeAvatar,
} from "./avatar.js";
export {
  getMe,
  type Language,
  languageSchema,
  languages,
  type Me,
  type MeUpdateBody,
  meSchema,
  meUpdateBodySchema,
  updateMe,
} from "./profile.js";

/** The signed-in person's routes, and the pictures of everyone. */
export const meContract = {
  get: getMe,
  update: updateMe,
  setAvatar: setMeAvatar,
  deleteAvatar: deleteMeAvatar,
  getAvatar: getUserAvatar,
};
