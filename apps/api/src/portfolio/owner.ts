import { writerRoles } from "@fpr/contracts";
import { type Db, type User, users } from "@fpr/db";
import { apiError } from "../errors.js";

/**
 * The person whose portfolio a route reads or writes: an admin or a member.
 * Nobody with that id, a guest, or an anonymous viewer is `not_found`.
 */
export async function findPortfolioOwner(
  db: Db,
  userId: string,
): Promise<User> {
  const user = await users.findById(db, userId);
  if (
    user === undefined ||
    !(writerRoles as readonly string[]).includes(user.role)
  ) {
    throw apiError("not_found");
  }
  return user;
}

/** A moment the person sent, refused with `future_moment` when it is after now. */
export function pastMoment(at: string): Date {
  const moment = new Date(at);
  if (moment.getTime() > Date.now()) {
    throw apiError("future_moment");
  }
  return moment;
}
