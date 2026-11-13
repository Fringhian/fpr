import { type Kysely, sql } from "kysely";
import type { Migration } from "kysely/migration";

/**
 * The price service's tables: `shares`, their `prices`, and the
 * `manual_price_events` that record each value point added, edited, or
 * deleted on a manual share. A share's prices and value edits go with it.
 */
export const migration: Migration = {
  async up(db: Kysely<unknown>) {
    await sql`
      create table shares (
        id uuid primary key default uuidv7(),
        isin text not null unique
          check (isin ~ '^[A-Z]{2}[A-Z0-9]{9}[0-9]$'),
        name text not null check (name <> ''),
        kind text not null check (kind in ('market', 'manual')),
        trading_currency text check (trading_currency ~ '^[A-Z]{3}$'),
        provider_symbol text check (provider_symbol <> ''),
        exchange text check (exchange <> ''),
        history_starts_on date,
        created_by uuid references "user" (id) on delete set null,
        created_at timestamptz not null default now(),
        constraint shares_listing_check check (
          case kind
            when 'market' then provider_symbol is not null
              and exchange is not null
              and trading_currency is not null
            else provider_symbol is null and exchange is null
          end
        )
      )
    `.execute(db);

    await sql`
      create table prices (
        share_id uuid not null references shares (id) on delete cascade,
        at timestamptz not null,
        price_eur numeric not null check (price_eur > 0),
        source text not null
          check (source in ('close', 'intraday', 'manual')),
        entered_by uuid references "user" (id) on delete set null,
        created_at timestamptz not null default now(),
        primary key (share_id, at),
        constraint prices_entered_by_check
          check (source = 'manual' or entered_by is null)
      )
    `.execute(db);

    await sql`
      create table manual_price_events (
        id uuid primary key default uuidv7(),
        share_id uuid not null references shares (id) on delete cascade,
        at timestamptz not null,
        action text not null check (action in ('added', 'edited', 'deleted')),
        price_eur numeric check (price_eur > 0),
        previous_price_eur numeric check (previous_price_eur > 0),
        user_id uuid references "user" (id) on delete set null,
        created_at timestamptz not null default now(),
        constraint manual_price_events_prices_check check (
          case action
            when 'added' then price_eur is not null
              and previous_price_eur is null
            when 'edited' then price_eur is not null
              and previous_price_eur is not null
            else price_eur is null and previous_price_eur is not null
          end
        )
      )
    `.execute(db);

    await sql`create index shares_created_by_idx on shares (created_by)`.execute(
      db,
    );
    await sql`create index prices_entered_by_idx on prices (entered_by)`.execute(
      db,
    );
    await sql`
      create index prices_intraday_at_idx on prices (at)
        where source = 'intraday'
    `.execute(db);
    await sql`
      create index manual_price_events_share_id_at_idx
        on manual_price_events (share_id, at)
    `.execute(db);
    await sql`
      create index manual_price_events_user_id_idx
        on manual_price_events (user_id)
    `.execute(db);
  },
};
