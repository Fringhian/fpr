import { type Kysely, sql } from "kysely";
import type { Migration } from "kysely/migration";

/**
 * The tables behind every portfolio: `portfolio_changes`, each change to a
 * holding, and `cash_balances`, each cash declaration, with the view
 * `current_positions`. A person's entries go with them; a share someone
 * recorded can't be deleted.
 */
export const migration: Migration = {
  async up(db: Kysely<unknown>) {
    await sql`
      create table portfolio_changes (
        id uuid primary key default uuidv7(),
        user_id uuid not null references "user" (id) on delete cascade,
        share_id uuid not null references shares (id) on delete restrict,
        quantity_delta numeric not null check (quantity_delta <> 0),
        effective_at timestamptz not null,
        created_by uuid references "user" (id) on delete set null,
        created_at timestamptz not null default now()
      )
    `.execute(db);

    await sql`
      create table cash_balances (
        id uuid primary key default uuidv7(),
        user_id uuid not null references "user" (id) on delete cascade,
        amount_eur numeric not null check (amount_eur >= 0),
        effective_at timestamptz not null,
        created_by uuid references "user" (id) on delete set null,
        created_at timestamptz not null default now()
      )
    `.execute(db);

    await sql`
      create index portfolio_changes_user_id_share_id_effective_at_idx
        on portfolio_changes (user_id, share_id, effective_at)
    `.execute(db);
    await sql`
      create index portfolio_changes_share_id_effective_at_idx
        on portfolio_changes (share_id, effective_at)
    `.execute(db);
    await sql`
      create index portfolio_changes_created_by_idx
        on portfolio_changes (created_by)
    `.execute(db);
    await sql`
      create index cash_balances_user_id_effective_at_idx
        on cash_balances (user_id, effective_at)
    `.execute(db);
    await sql`
      create index cash_balances_created_by_idx on cash_balances (created_by)
    `.execute(db);

    await sql`
      create view current_positions as
        select user_id, share_id, sum(quantity_delta) as quantity
        from portfolio_changes
        group by user_id, share_id
        having sum(quantity_delta) > 0
    `.execute(db);
  },
};
