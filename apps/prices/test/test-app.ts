import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Writable } from "node:stream";
import type { Db } from "@fpr/db";
import { createTestDatabase } from "@fpr/db/testing";
import type { Express } from "express";
import { createApp } from "../src/app.js";
import { createLogger } from "../src/logger.js";

const TEST_TOKEN = "test-token";

export interface TestApp {
  db: Db;
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

/** Starts the app on a random local port, on a fresh test database. */
export async function startTestApp(): Promise<TestApp> {
  const database = await createTestDatabase();
  const silent = new Writable({ write: (_chunk, _encoding, done) => done() });
  let people = 0;
  const testApp: TestApp = {
    db: database.db,
    now: new Date(),
    call: (method, path, body) => sendJson(`${url}${path}`, method, body),
    addPerson: () => insertPerson(database.db, ++people),
    async close() {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await database.drop();
    },
  };
  const server = await listen(
    createApp({
      db: database.db,
      logger: createLogger({ destination: silent }),
      token: TEST_TOKEN,
      timeZone: "Europe/Paris",
      now: () => testApp.now,
    }),
  );
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return testApp;
}
