import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Writable } from "node:stream";
import type { Db } from "@fpr/db";
import { createTestDatabase } from "@fpr/db/testing";
import type { Express } from "express";
import { type Mock, vi } from "vitest";
import { createApp } from "../src/app.js";
import { createLogger } from "../src/logger.js";
import { createCallBudget } from "../src/market/budget.js";
import { createRatesClient } from "../src/market/frankfurter.js";
import { createPricing, type Pricing } from "../src/pricing/pricing.js";
import { createEodhdProvider } from "../src/providers/eodhd/eodhd.js";
import type { Fetch } from "../src/providers/http.js";

const TEST_TOKEN = "test-token";

export interface TestApp {
  db: Db;
  /** The moment the app takes as now. Tests may move it. */
  now: Date;
  /** Answers the provider's requests, to EODHD's API at `https://eodhd.test/api`. */
  provider: Mock<Fetch>;
  /** Answers the rates requests, to Frankfurter at `https://rates.test`. */
  rates: Mock<Fetch>;
  pricing: Pricing;
  /** The daily closes' retries waiting for their hour, oldest first. */
  retries: (() => void)[];
  /** Every log line written so far. */
  logs(): Record<string, unknown>[];
  /** Sends a JSON request with the token, and resolves with the status and the parsed body. */
  call(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; body: unknown }>;
  /** Adds a member and resolves with their id. */
  addPerson(): Promise<string>;
  /** Stops the server and drops the test database. */
  close(): Promise<void>;
}

async function sendJson(
  url: string,
  method: string,
  body: unknown,
): Promise<{ status: number; body: unknown }> {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${TEST_TOKEN}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text === "" ? undefined : JSON.parse(text),
  };
}

async function insertPerson(db: Db, n: number): Promise<string> {
  const row = await db
    .insertInto("user")
    .values({
      email: `person${n}@example.com`,
      displayName: `Person ${n}`,
      avatarKey: null,
      role: "member",
      color: (n % 10) + 1,
      locale: null,
      onboardedAt: null,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
}

function listen(app: Express): Promise<Server> {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

/** A fetch that fails the test: every request must be answered by the test. */
function unanswered(): Mock<Fetch> {
  return vi.fn<Fetch>(async (input) => {
    throw new Error(`Unexpected request: ${String(input)}`);
  });
}

/**
 * Starts the app on a random local port, on a fresh test database, with the
 * EODHD provider and the rates client answered by mocks. No request reaches
 * the network.
 */
export async function startTestApp(
  options: { callLimit?: number } = {},
): Promise<TestApp> {
  const database = await createTestDatabase();
  const rawLines: string[] = [];
  const logger = createLogger({
    destination: new Writable({
      write(chunk, _encoding, done) {
        rawLines.push(chunk.toString());
        done();
      },
    }),
  });
  let people = 0;
  const provider = unanswered();
  const rates = unanswered();
  const retries: (() => void)[] = [];
  const clock = { now: new Date() };
  const now = () => clock.now;
  const budget = createCallBudget({
    limit: options.callLimit ?? 1000,
    timeZone: "Europe/Paris",
    now,
  });
  const pricing = createPricing(
    {
      db: database.db,
      logger,
      provider: createEodhdProvider({
        apiKey: "test-eodhd-key",
        logger,
        budget,
        fetch: provider,
        baseUrl: "https://eodhd.test/api",
      }),
      rates: createRatesClient({
        logger,
        baseUrl: "https://rates.test",
        fetch: rates,
      }),
      budget,
      timeZone: "Europe/Paris",
      now,
    },
    {
      later: (task) => {
        retries.push(task);
        return () => {
          const index = retries.indexOf(task);
          if (index >= 0) {
            retries.splice(index, 1);
          }
        };
      },
    },
  );
  const testApp: TestApp = {
    db: database.db,
    get now() {
      return clock.now;
    },
    set now(moment) {
      clock.now = moment;
    },
    provider,
    rates,
    pricing,
    retries,
    logs: () =>
      rawLines
        .join("")
        .split("\n")
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line) as Record<string, unknown>),
    call: (method, path, body) => sendJson(`${url}${path}`, method, body),
    addPerson: () => insertPerson(database.db, ++people),
    async close() {
      pricing.dailyCloses.stop();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await database.drop();
    },
  };
  const server = await listen(
    createApp({ logger, token: TEST_TOKEN, pricing }),
  );
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return testApp;
}
