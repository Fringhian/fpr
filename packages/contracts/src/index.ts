/**
 * `@fpr/contracts`: the API's routes, reached through `apiContract`, with the
 * types of their inputs and outputs and the schemas the areas share. The price
 * service's routes are in `@fpr/contracts/prices`, and the OpenAPI generator
 * in `@fpr/contracts/openapi`.
 */
export {
  type AnonymizeKind,
  type AnonymizeMeta,
  anonymizeKind,
  anonymizeKinds,
  anonymizeRegistry,
  euro,
  personal,
  quantity,
} from "./anonymize.js";
export {
  accessKeyStates,
  accessSignInMethods,
} from "./api/access/access-keys.js";
export type * from "./api/access/index.js";
export type * from "./api/admin/index.js";
export { adminAccessStatuses } from "./api/admin/people.js";
export { type ApiContract, apiContract } from "./api/index.js";
export { avatarMaxBytes, avatarMediaTypes } from "./api/me/avatar.js";
export type * from "./api/me/index.js";
export { languages } from "./api/me/profile.js";
export type * from "./api/portfolio/index.js";
export type * from "./api/race/index.js";
export { leaderboardBoards } from "./api/race/leaderboards.js";
export type * from "./api/shares/index.js";
export { shareValueActions } from "./api/shares/values.js";
export {
  type Access,
  type ContractTree,
  contractProcedures,
  errorMap,
  errorWithDetails,
  publicRoute,
  type RouteMeta,
  signedInRoute,
} from "./contract.js";
export { type Decimal, decimalPattern, decimalSchema } from "./decimal.js";
export {
  type ErrorBody,
  type ErrorCode,
  type ErrorStatus,
  errorCodeSchema,
  errorCodes,
  errorSchema,
  errorStatus,
  type InvalidRequestDetails,
  invalidRequestDetailsSchema,
  type ValidationIssueCode,
  validationIssueCodeSchema,
  validationIssueCodes,
} from "./errors.js";
export {
  type Period,
  type PeriodQuery,
  periodQuerySchema,
  periodSchema,
  periods,
  type Unit,
  unitSchema,
  units,
} from "./period.js";
export {
  adminAreaRoles,
  adminRoles,
  profileRoles,
  Role,
  roleSchema,
  roles,
  writerRoles,
} from "./roles.js";
export * from "./schemas/index.js";
