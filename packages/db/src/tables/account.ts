import type { Generated, Insertable, Selectable, Updateable } from "kysely";

/**
 * Better Auth's credential row: the hashed password. Created when the person
 * first uses their access key. Anonymous viewers have none.
 */
export interface AccountTable {
  id: Generated<string>;
  /** Better Auth's id of the account at its provider: the user's id. */
  accountId: string;
  /** `credential` for a password. */
  providerId: string;
  userId: string;
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  scope: string | null;
  /** The password's hash. */
  password: string | null;
  createdAt: Generated<Date>;
  updatedAt: Date;
}

export type Account = Selectable<AccountTable>;
export type NewAccount = Insertable<AccountTable>;
export type AccountUpdate = Updateable<AccountTable>;
