import {
  checkAccessKey,
  claimAccessKey,
  signInWithAccessKey,
} from "./access-keys.js";
import { checkPasswordReset, resetPassword } from "./password-reset.js";
import { getSetupStatus, setUpFirstAdmin } from "./setup.js";

export type * from "./access-keys.js";
export type * from "./password-reset.js";
export type * from "./setup.js";

/** The public routes: setup, access links, and password reset. */
export const accessContract = {
  setupStatus: getSetupStatus,
  setup: setUpFirstAdmin,
  check: checkAccessKey,
  claim: claimAccessKey,
  signIn: signInWithAccessKey,
  checkReset: checkPasswordReset,
  reset: resetPassword,
};
