import { getMe } from "./routes.js";

export {
  getMe,
  type Language,
  languageSchema,
  languages,
  type Me,
  meSchema,
} from "./routes.js";

/** The signed-in person's routes. */
export const meContract = {
  get: getMe,
};
