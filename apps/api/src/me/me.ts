import { type Me, Role } from "@fpr/contracts";
import type { User } from "@fpr/db";

/**
 * A picture's object key: `avatars/<userId>/<version>.webp`. A new picture
 * gets a new version, so its key, and its URL, are new.
 */
export function avatarKey(userId: string, version: string): string {
  return `avatars/${userId}/${version}.webp`;
}

/** A picture's version, from its object key. */
export function avatarVersion(key: string): string {
  const name = key.slice(key.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot === -1 ? name : name.slice(0, dot);
}

/**
 * The URL of a person's picture, `/api/users/<id>/avatar?v=<version>`, or
 * `null` without one. It changes with the picture, so a browser caches each
 * version for good.
 */
export function avatarUrl(user: Pick<User, "id" | "avatarKey">): string | null {
  if (user.avatarKey === null) {
    return null;
  }
  const version = encodeURIComponent(avatarVersion(user.avatarKey));
  return `/api/users/${user.id}/avatar?v=${version}`;
}

/** The signed-in person, as `GET /me` answers them. Anonymous viewers have no picture. */
export function toMe(user: User): Me {
  return {
    id: user.id,
    displayName: user.displayName,
    avatarUrl: user.role === Role.anonymous ? null : avatarUrl(user),
    color: user.color,
    role: user.role,
    language: user.locale,
    onboarded: user.onboardedAt !== null,
  };
}
