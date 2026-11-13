import type { Generated, Insertable, Selectable, Updateable } from "kysely";

/** Every role a person can have. */
export type Role = "admin" | "member" | "guest" | "anonymous";

/** A language a person picks in Settings. */
export type Locale = "fr" | "en";

/**
 * One row per person the admin added: Better Auth's table, extended with
 * FPR's columns. Better Auth's `name` and `image` are `displayName` and
 * `avatarKey`.
 */
export interface UserTable {
  id: Generated<string>;
  /** The sign-in name, in lowercase. Unique. */
  email: string;
  /** Better Auth's. FPR doesn't verify emails. */
  emailVerified: Generated<boolean>;
  /** 1 to 40 characters. */
  displayName: string;
  /** The uploaded picture's object key. `null` draws the initial on the colour. */
  avatarKey: string | null;
  role: Role;
  /** 1 to 10. */
  color: number;
  /** `null` until the person picks one: the web app follows the browser. */
  locale: Locale | null;
  /** `null` until the person finishes onboarding. */
  onboardedAt: Date | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export type User = Selectable<UserTable>;
export type NewUser = Insertable<UserTable>;
export type UserUpdate = Updateable<UserTable>;
