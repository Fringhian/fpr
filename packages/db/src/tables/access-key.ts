import type { Generated, Insertable, Selectable, Updateable } from "kysely";

/**
 * A person's access, kept for as long as they have it. The key itself is
 * shown to the admin once, as a link, and never stored.
 */
export interface AccessKeyTable {
  id: Generated<string>;
  /** The person it gives access to. */
  userId: string;
  /** The key's hash. Unique. */
  codeHash: string;
  /** The deadline for the first use. Defaults to 7 days after creation. */
  claimBefore: Generated<Date>;
  /** The first use. `null` until then. */
  claimedAt: Date | null;
  /** When access ends. `null` means no end. */
  accessUntil: Date | null;
  /** When the admin revoked it. Restoring access clears it. */
  revokedAt: Date | null;
  /** The admin who created it. `null` once that admin is deleted. */
  createdBy: string | null;
  createdAt: Generated<Date>;
}

export type AccessKey = Selectable<AccessKeyTable>;
export type NewAccessKey = Insertable<AccessKeyTable>;
export type AccessKeyUpdate = Updateable<AccessKeyTable>;
