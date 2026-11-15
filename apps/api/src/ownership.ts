import { Role } from "@fpr/contracts";
import { apiError } from "./errors.js";
import type { Viewer } from "./pipeline/index.js";

/**
 * Refuses with `forbidden` a write to another person's data: the admin
 * writes anyone's, everyone else only their own. A handler of a `{userId}`
 * write calls it with the validated `userId`, compared without case.
 */
export function assertMayWriteUser(viewer: Viewer, userId: string): void {
  if (
    viewer.role !== Role.admin &&
    userId.toLowerCase() !== viewer.id.toLowerCase()
  ) {
    throw apiError("forbidden");
  }
}
