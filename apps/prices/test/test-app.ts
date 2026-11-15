import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Writable } from "node:stream";
import type { Db } from "@fpr/db";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { createApp } from "../src/app.js";
import { createLogger } from "../src/logger.js";

/** The bearer token of every test app. */
const TEST_TOKEN = "test-token";

export interface TestApp {
  db: Db;
  url: string;
  /** The moment the app takes as now. Tests may move it. */
  now: Date;
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

/** Starts the app on a random local port, on a fresh test database. */
export async function startTestApp(): Promise<TestApp> {
  const database: TestDatabase = await createTestDatabase();
  const destination = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  let people = 0;
  const testApp: TestApp = {
    db: database.db,
    url: "",
    now: new Date(),
    async call(method, path, body) {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${TEST_TOKEN}`,
      };
      if (body !== undefined) {
        headers["Content-Type"] = "application/json";
      }
      const response = await fetch(`${testApp.url}${path}`, {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const text = await response.text();
      return {
        status: response.status,
        body: text === "" ? undefined : JSON.parse(text),
      };
    },
    async addPerson() {
      people += 1;
      const row = await database.db
        .insertInto("user")
        .values({
          email: `person${people}@example.com`,
          displayName: `Person ${people}`,
          avatarKey: null,
          role: "member",
          color: (people % 10) + 1,
          locale: null,
          onboardedAt: null,
        })
        .returning("id")
        .executeTakeFirstOrThrow();
      return row.id;
    },
    async close() {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await database.drop();
    },
  };
  const app = createApp({
    db: database.db,
    logger: createLogger({ destination }),
    token: TEST_TOKEN,
    timeZone: "Europe/Paris",
    now: () => testApp.now,
  });
  const server: Server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const { port } = server.address() as AddressInfo;
  testApp.url = `http://127.0.0.1:${port}`;
  return testApp;
}
