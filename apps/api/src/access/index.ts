import {
  checkAccessKey,
  claimAccessKey,
  signInWithAccessKey,
} from "./access-links.js";
import { checkPasswordReset, resetPassword } from "./password-reset.js";
import { getSetupStatus, setUpFirstAdmin } from "./setup.js";

/** The handlers of `apiContract.access`: setup, access links, and password reset. */
export const accessRouter = {
  setupStatus: getSetupStatus,
  setup: setUpFirstAdmin,
  check: checkAccessKey,
  claim: claimAccessKey,
  signIn: signInWithAccessKey,
  checkReset: checkPasswordReset,
  reset: resetPassword,
};
