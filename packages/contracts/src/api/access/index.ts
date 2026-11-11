import {
  checkAccessKey,
  claimAccessKey,
  signInWithAccessKey,
} from "./access-keys.js";
import { checkPasswordReset, resetPassword } from "./password-reset.js";
import { getSetupStatus, setUpFirstAdmin } from "./setup.js";

export {
  type AccessCheckBody,
  type AccessCheckResponse,
  type AccessClaimBody,
  type AccessClaimResponse,
  type AccessKeyErrorDetails,
  type AccessKeyState,
  type AccessSignInBody,
  type AccessSignInMethod,
  accessCheckBodySchema,
  accessCheckResponseSchema,
  accessClaimBodySchema,
  accessClaimResponseSchema,
  accessKeyErrorDetailsSchema,
  accessKeySchema,
  accessKeyStateSchema,
  accessKeyStates,
  accessSignInBodySchema,
  accessSignInMethodSchema,
  accessSignInMethods,
  checkAccessKey,
  claimAccessKey,
  signInWithAccessKey,
} from "./access-keys.js";
export { passwordSchema } from "./password.js";
export {
  checkPasswordReset,
  type PasswordResetBody,
  type PasswordResetCheckBody,
  passwordResetBodySchema,
  passwordResetCheckBodySchema,
  resetPassword,
} from "./password-reset.js";
export {
  getSetupStatus,
  type SetupBody,
  type SetupStatus,
  setUpFirstAdmin,
  setupBodySchema,
  setupStatusSchema,
} from "./setup.js";

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
