/**
 * Helpers for the tests that run the app on a test database: the app on a
 * local port, people with each role, and signing them in. Not part of the
 * build.
 */
import { randomBytes, randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Writable } from "node:stream";
import { accessKeys, type Db, type Role, users } from "@fpr/db";
import type { AnyRouter } from "@orpc/server";
import { createApp } from "../src/app.js";
import { type Auth, createAuth } from "../src/auth.js";
import { createLogger } from "../src/logger.js";

export const TEST_PUBLIC_URL = "https://fpr.example.test";

export const TEST_PASSWORD = "a long enough password";

/** Better Auth on a test database, as `index.ts` builds it. */
export function createTestAuth(db: Db): Auth {
  return createAuth({
    db,
    secret: "a-test-secret-of-at-least-thirty-two-characters",
    baseURL: TEST_PUBLIC_URL,
  });
}

export interface TestServer {
  url: string;
  /** Every log line written so far. */
  lines(): Record<string, unknown>[];
  close(): Promise<void>;
}

/** Starts the app on a random local port and captures its log lines. */
export async function serveApp(options: {
  db: Db;
  auth: Auth;
  router?: AnyRouter;
}): Promise<TestServer> {
  const chunks: string[] = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });
  const app = createApp({
    ...options,
    publicUrl: TEST_PUBLIC_URL,
    logger: createLogger({ destination }),
  });
  const server: Server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    lines: () =>
      chunks
        .join("")
        .split("\n")
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line) as Record<string, unknown>),
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

export interface TestPerson {
  id: string;
  email: string;
  keyId: string;
}

/**
 * Adds a person with a role, a password, and a claimed access key that gives
 * access with no end.
 */
export async function addPerson(
  db: Db,
  auth: Auth,
  role: Role,
): Promise<TestPerson> {
  const email = `${randomUUID()}@example.com`;
  const user = await users.insert(db, {
    email,
    displayName: `Test ${role}`,
    role,
    color: 1,
    avatarKey: null,
    locale: null,
    onboardedAt: null,
  });
  const key = await accessKeys.insert(db, {
    userId: user.id,
    codeHash: randomBytes(32).toString("hex"),
    claimedAt: new Date(),
    accessUntil: null,
    revokedAt: null,
    createdBy: null,
  });
  const context = await auth.$context;
  await context.internalAdapter.linkAccount({
    accountId: user.id,
    providerId: "credential",
    userId: user.id,
    password: await context.password.hash(TEST_PASSWORD),
  });
  return { id: user.id, email, keyId: key.id };
}

let clientCount = 0;

/**
 * A client address of its own for each call, so the sign-in rate limit,
 * kept per address, never counts one test's requests in another's.
 */
export function newClientAddress(): string {
  clientCount += 1;
  return `10.${(clientCount >> 16) & 255}.${(clientCount >> 8) & 255}.${clientCount & 255}`;
}

/**
 * Signs in through `/api/auth/sign-in/email`, from an address of its own,
 * or with no client address when `clientAddress` is `null`.
 */
export function postSignIn(
  server: TestServer,
  email: string,
  password: string,
  clientAddress: string | null = newClientAddress(),
): Promise<Response> {
  return fetch(`${server.url}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: TEST_PUBLIC_URL,
      ...(clientAddress === null ? {} : { "X-Forwarded-For": clientAddress }),
    },
    body: JSON.stringify({ email, password }),
  });
}

/** The `Cookie` header that sends back the cookies a response set. */
export function cookieFrom(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

/** Signs a person in and resolves with their session's `Cookie` header. */
export async function signIn(
  server: TestServer,
  person: TestPerson,
): Promise<string> {
  const response = await postSignIn(server, person.email, TEST_PASSWORD);
  if (response.status !== 200) {
    throw new Error(`Sign-in answered ${response.status}`);
  }
  return cookieFrom(response);
}
