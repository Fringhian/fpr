import type { Generated, Insertable, Selectable, Updateable } from "kysely";

/** Better Auth's sessions, one row per signed-in browser. */
export interface SessionTable {
  id: Generated<string>;
  expiresAt: Date;
  /** The session cookie's token. Unique. */
  token: string;
  createdAt: Generated<Date>;
  updatedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  userId: string;
}

export type Session = Selectable<SessionTable>;
export type NewSession = Insertable<SessionTable>;
export type SessionUpdate = Updateable<SessionTable>;
