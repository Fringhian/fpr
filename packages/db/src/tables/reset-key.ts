import type { Generated, Insertable, Selectable, Updateable } from "kysely";

/** A one-time password reset for one person. */
export interface ResetKeyTable {
  id: Generated<string>;
  /** The only person it can reset. */
  userId: string;
  /** The key's hash. Unique. */
  codeHash: string;
  /** Defaults to 24 hours after creation. */
  expiresAt: Generated<Date>;
  /** When the person reset their password with it. `null` until then. */
  usedAt: Date | null;
  /** When a newer reset key replaced it. */
  revokedAt: Date | null;
  /** The admin who created it. `null` once that admin is deleted. */
  createdBy: string | null;
  createdAt: Generated<Date>;
}

export type ResetKey = Selectable<ResetKeyTable>;
export type NewResetKey = Insertable<ResetKeyTable>;
export type ResetKeyUpdate = Updateable<ResetKeyTable>;
