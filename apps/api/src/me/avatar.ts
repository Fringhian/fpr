import { randomUUID } from "node:crypto";
import { avatarMaxBytes } from "@fpr/contracts";
import { type Db, type User, users } from "@fpr/db";
import type { Response } from "express";
import type { Logger } from "pino";
import { apiError } from "../errors.js";
import type { AvatarStore } from "../storage/avatar-store.js";
import { prepareAvatar, storedAvatarType } from "./avatar-image.js";
import { avatarKey, avatarVersion } from "./me.js";

interface AvatarServices {
  db: Db;
  avatars: AvatarStore;
}

/** The current version of a picture is cached for good: its URL changes with it. */
const versionedCacheControl = "private, max-age=31536000, immutable";

/** A request without the current version revalidates each time. */
const unversionedCacheControl = "private, no-cache";

/**
 * Stores a new picture for the person, then points their row at it and
 * removes the one it replaces, in one transaction that locks the row. When
 * the row can't change, or the old picture can't be removed, the new one is
 * removed and the person keeps the old one.
 */
export async function replaceAvatar(
  { db, avatars }: AvatarServices,
  userId: string,
  file: File,
  log: Logger,
): Promise<User> {
  if (file.size > avatarMaxBytes) {
    throw apiError("avatar_too_large");
  }
  const picture = await prepareAvatar(
    new Uint8Array(await file.arrayBuffer()),
    file.type,
  );
  const key = avatarKey(userId, randomUUID());
  await avatars.put(key, picture, storedAvatarType);

  try {
    return await db.transaction().execute(async (trx) => {
      const user = await users.findByIdForUpdate(trx, userId);
      if (user === undefined) {
        throw apiError("unauthenticated");
      }
      const updated = await users.update(trx, userId, { avatarKey: key });
      if (user.avatarKey !== null) {
        await avatars.remove(user.avatarKey);
      }
      return updated ?? user;
    });
  } catch (error) {
    await avatars.remove(key).catch((removeError: unknown) => {
      log.error(
        { err: removeError, key },
        "an uploaded picture was left in the bucket",
      );
    });
    throw error;
  }
}

/**
 * Removes the person's picture from the bucket and empties `avatar_key`, in
 * one transaction that locks their row: once it answers, the picture is
 * gone.
 */
export async function removeAvatar(
  { db, avatars }: AvatarServices,
  userId: string,
): Promise<User> {
  return db.transaction().execute(async (trx) => {
    const user = await users.findByIdForUpdate(trx, userId);
    if (user === undefined) {
      throw apiError("unauthenticated");
    }
    if (user.avatarKey === null) {
      return user;
    }
    const updated = await users.update(trx, userId, { avatarKey: null });
    await avatars.remove(user.avatarKey);
    return updated ?? user;
  });
}

/**
 * A person's picture, with its cache headers on `res`: the current version,
 * asked for by its `v`, is cached for good, and any other request is
 * revalidated. `not_found` for an unknown person or one without a picture.
 */
export async function readAvatar(
  { db, avatars }: AvatarServices,
  userId: string,
  version: string | undefined,
  res: Response,
): Promise<File> {
  const user = await users.findById(db, userId);
  if (user === undefined || user.avatarKey === null) {
    throw apiError("not_found");
  }
  const object = await avatars.get(user.avatarKey);
  if (object === null) {
    throw apiError("not_found");
  }
  res.setHeader(
    "Cache-Control",
    version === avatarVersion(user.avatarKey)
      ? versionedCacheControl
      : unversionedCacheControl,
  );
  return new File([object.body], "avatar.webp", { type: object.contentType });
}
