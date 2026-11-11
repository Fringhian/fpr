import type { Kysely } from "kysely";
import { afterEach, describe, expect, it, vi } from "vitest";
import { close, createDb, ping } from "./database.js";

/** A Postgres URL nothing listens on. */
const UNREACHABLE_URL = "postgres://fpr:fpr@127.0.0.1:1/fpr";

interface ExampleDatabase {
  portfolioChanges: {
    userId: string;
    quantityDelta: string;
    effectiveAt: Date;
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createDb", () => {
  it("reads DATABASE_URL by default", async () => {
    vi.stubEnv("DATABASE_URL", UNREACHABLE_URL);
    const db = createDb();
    await expect(ping(db)).rejects.toThrow("127.0.0.1:1");
    await close(db);
  });

  it("refuses to start without a connection string", () => {
    vi.stubEnv("DATABASE_URL", undefined);
    expect(() => createDb()).toThrow("DATABASE_URL is not set");
  });

  it("writes identifiers in snake_case", async () => {
    const db = createDb({
      url: UNREACHABLE_URL,
    }) as unknown as Kysely<ExampleDatabase>;
    const { sql } = db
      .selectFrom("portfolioChanges")
      .select(["userId", "effectiveAt"])
      .where("quantityDelta", ">", "0")
      .compile();
    expect(sql).toBe(
      'select "user_id", "effective_at" from "portfolio_changes" where "quantity_delta" > $1',
    );
    await db.destroy();
  });
});

describe("ping", () => {
  it("rejects when Postgres does not answer", async () => {
    const db = createDb({ url: UNREACHABLE_URL });
    await expect(ping(db)).rejects.toThrow();
    await close(db);
  });
});

describe("close", () => {
  it("ends the pool, so no query runs after it", async () => {
    const db = createDb({ url: UNREACHABLE_URL });
    await expect(ping(db)).rejects.toThrow("127.0.0.1:1");
    await close(db);
    await expect(ping(db)).rejects.toThrow("driver has already been destroyed");
  });
});
