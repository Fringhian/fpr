import { type Kysely, sql } from "kysely";
import type { Migration } from "kysely/migration";

/**
 * FPR's keys: `access_keys`, a person's access, and `reset_keys`, one-time
 * password resets. Each stores only the hash of its key. A person's keys go
 * with them; the admin who created a key is set to empty when deleted. A
 * person holds at most one access key that is not revoked.
 */
export const migration: Migration = {
  async up(db: Kysely<unknown>) {
    await sql`
      create table access_keys (
        id uuid primary key default uuidv7(),
        user_id uuid not null references "user" (id) on delete cascade,
        code_hash text not null unique,
        claim_before timestamptz not null default now() + interval '7 days',
        claimed_at timestamptz,
        access_until timestamptz,
        revoked_at timestamptz,
        created_by uuid references "user" (id) on delete set null,
        created_at timestamptz not null default now()
      )
    `.execute(db);

    await sql`
      create table reset_keys (
        id uuid primary key default uuidv7(),
        user_id uuid not null references "user" (id) on delete cascade,
        code_hash text not null unique,
        expires_at timestamptz not null default now() + interval '24 hours',
        used_at timestamptz,
        revoked_at timestamptz,
        created_by uuid references "user" (id) on delete set null,
        created_at timestamptz not null default now()
      )
    `.execute(db);

    await sql`
      create index access_keys_user_id_idx on access_keys (user_id)
    `.execute(db);
    await sql`
      create index access_keys_created_by_idx on access_keys (created_by)
    `.execute(db);
    // A person holds at most one key that is not revoked: replacing a link
    // revokes the old key before creating the new one.
    await sql`
      create unique index access_keys_one_unrevoked_per_user_idx
        on access_keys (user_id) where revoked_at is null
    `.execute(db);
    await sql`
      create index reset_keys_user_id_idx on reset_keys (user_id)
    `.execute(db);
    await sql`
      create index reset_keys_created_by_idx on reset_keys (created_by)
    `.execute(db);
  },
};
