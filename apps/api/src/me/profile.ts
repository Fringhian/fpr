import { colorCount, type MeUpdateBody } from "@fpr/contracts";
import { type Db, type User, type UserChanges, users } from "@fpr/db";
import { apiError } from "../errors.js";

/** The signed-in person's row. Their session goes with it, so it exists. */
export async function findMe(db: Db, userId: string): Promise<User> {
  const user = await users.findById(db, userId);
  if (user === undefined) {
    throw apiError("unauthenticated");
  }
  return user;
}

/**
 * Applies `PATCH /me` to the person's row, in one transaction that locks it.
 * A new colour takes the colours' lock first, so of two people picking the
 * same free colour at once, the second is refused with `color_taken`. A
 * colour another person has is refused unless all ten are taken. Onboarding
 * keeps the moment it was first finished.
 */
export async function updateProfile(
  db: Db,
  userId: string,
  body: MeUpdateBody,
): Promise<User> {
  return db.transaction().execute(async (trx) => {
    if (body.color !== undefined) {
      await users.lockColors(trx);
    }
    const user = await users.findByIdForUpdate(trx, userId);
    if (user === undefined) {
      throw apiError("unauthenticated");
    }
    if (body.color !== undefined && body.color !== user.color) {
      const othersColors = await users.colorsInUse(trx, userId);
      if (
        othersColors.includes(body.color) &&
        othersColors.length < colorCount
      ) {
        throw apiError("color_taken");
      }
    }
    const changes: UserChanges = {
      ...(body.displayName === undefined
        ? {}
        : { displayName: body.displayName }),
      ...(body.color === undefined ? {} : { color: body.color }),
      ...(body.language === undefined ? {} : { locale: body.language }),
      ...(body.onboarded === undefined
        ? {}
        : { onboardedAt: user.onboardedAt ?? new Date() }),
    };
    return (await users.update(trx, userId, changes)) ?? user;
  });
}
