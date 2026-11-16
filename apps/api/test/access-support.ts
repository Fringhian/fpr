/**
 * Helpers for the tests of the public routes: setup, access links, and
 * password reset. Not part of the build.
 */
import { randomUUID } from "node:crypto";
import {
  type ApiContract,
  type ErrorCode,
  errorSchema,
  errorStatus,
} from "@fpr/contracts";
import { accessKeys, type Db, type Role, resetKeys, users } from "@fpr/db";
import { expect } from "vitest";
import type { z } from "zod";
import { newKey } from "../src/access/keys.js";
import type { Auth } from "../src/auth/auth.js";
import {
  cookieFrom,
  newClientAddress,
  SESSION_COOKIE,
  TEST_PASSWORD,
  TEST_PUBLIC_URL,
  type TestServer,
} from "./test-support.js";

export interface PostOptions {
  /** The client address, one of its own by default, or none with `null`. */
  address?: string | null;
  /** The `Origin`, the instance's own by default, or none with `null`. */
  origin?: string | null;
}

/** A JSON `POST` to `/api<path>`, from the instance's pages. */
export function post(
  server: TestServer,
  path: string,
  body: unknown,
  { address = newClientAddress(), origin = TEST_PUBLIC_URL }: PostOptions = {},
): Promise<Response> {
  return fetch(`${server.url}/api${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(origin === null ? {} : { Origin: origin }),
      ...(address === null ? {} : { "X-Forwarded-For": address }),
    },
    body: JSON.stringify(body),
  });
}

/** A route of `apiContract.access`. */
type AccessRoute = ApiContract["access"][keyof ApiContract["access"]];

/** The route's response body, parsed with its output schema. */
export async function parseOutput<Route extends AccessRoute>(
  route: Route,
  response: Response,
): Promise<z.infer<NonNullable<Route["~orpc"]["outputSchema"]>>> {
  const schema = route["~orpc"].outputSchema as z.ZodType;
  return schema.parse(await response.json()) as z.infer<
    NonNullable<Route["~orpc"]["outputSchema"]>
  >;
}

/**
 * Expects the error `code` with its status, declared by the route, and its
 * `details`, parsed with the schema the route declares for them.
 */
export async function expectError(
  route: { "~orpc": { errorMap: unknown } },
  response: Response,
  code: ErrorCode,
  details?: Record<string, unknown>,
): Promise<void> {
  expect(response.status).toBe(errorStatus[code]);
  const body = errorSchema.parse(await response.json());
  expect(body.error.code).toBe(code);
  const declared = (
    route["~orpc"].errorMap as Record<string, { data?: z.ZodType }>
  )[code];
  expect(declared).toBeDefined();
  declared?.data?.parse(body.error.details);
  expect(body.error.details).toEqual(details);
}

/** Expects a session cookie on the response, and resolves with the session's person. */
export async function expectSession(
  server: TestServer,
  response: Response,
): Promise<{ id: string; role: string; cookie: string }> {
  const cookie = cookieFrom(response);
  expect(cookie).toContain(`${SESSION_COOKIE}=`);
  const session = await fetch(`${server.url}/api/auth/get-session`, {
    headers: { Cookie: cookie },
  });
  const body = (await session.json()) as {
    user: { id: string; role: string };
  } | null;
  expect(body).not.toBeNull();
  return { id: body?.user.id ?? "", role: body?.user.role ?? "", cookie };
}

/** How a test person's access key starts. */
export interface KeyOptions {
  claimed?: boolean;
  /** The first-use deadline. A week ahead by default. */
  claimBefore?: Date;
  accessUntil?: Date | null;
  revoked?: boolean;
}

export interface KeyHolder {
  id: string;
  email: string;
  displayName: string;
  /** Their access key itself, as their link carries it. */
  key: string;
  keyId: string;
}

/**
 * Adds a person with an access key whose value the test knows, and a
 * password when `withPassword` is set. The key waits for first use unless
 * `key` says otherwise.
 */
export async function addKeyHolder(
  db: Db,
  auth: Auth,
  role: Role,
  { withPassword = false, key: keyOptions = {} } = {} as {
    withPassword?: boolean;
    key?: KeyOptions;
  },
): Promise<KeyHolder> {
  const user = await users.insert(db, {
    email: `${randomUUID()}@example.com`,
    displayName: `Test ${role}`,
    role,
    color: 1,
    avatarKey: null,
    locale: null,
    onboardedAt: null,
  });
  const { key, codeHash } = newKey();
  const row = await accessKeys.insert(db, {
    userId: user.id,
    codeHash,
    claimedAt: keyOptions.claimed ? new Date() : null,
    accessUntil: keyOptions.accessUntil ?? null,
    revokedAt: keyOptions.revoked ? new Date() : null,
    createdBy: null,
    ...(keyOptions.claimBefore === undefined
      ? {}
      : { claimBefore: keyOptions.claimBefore }),
  });
  if (withPassword) {
    const context = await auth.$context;
    await context.internalAdapter.linkAccount({
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: await context.password.hash(TEST_PASSWORD),
    });
  }
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    key,
    keyId: row.id,
  };
}

/**
 * Replaces the person's link: revokes their key and gives them a new one,
 * waiting for first use. Resolves with the new key.
 */
export async function replaceKey(
  db: Db,
  holder: KeyHolder,
): Promise<KeyHolder> {
  await accessKeys.revoke(db, holder.keyId);
  const { key, codeHash } = newKey();
  const row = await accessKeys.insert(db, {
    userId: holder.id,
    codeHash,
    claimedAt: null,
    accessUntil: null,
    revokedAt: null,
    createdBy: null,
  });
  return { ...holder, key, keyId: row.id };
}

/** Gives the person a reset key and resolves with it. */
export async function addResetKey(
  db: Db,
  userId: string,
  { expiresAt }: { expiresAt?: Date } = {},
): Promise<string> {
  const { key, codeHash } = newKey();
  await resetKeys.insert(db, {
    userId,
    codeHash,
    usedAt: null,
    revokedAt: null,
    createdBy: null,
    ...(expiresAt === undefined ? {} : { expiresAt }),
  });
  return key;
}

/** Adds a password user with a claimed access key and a usable reset key. */
export async function addResetKeyHolder(
  db: Db,
  auth: Auth,
): Promise<KeyHolder & { resetKey: string }> {
  const person = await addKeyHolder(db, auth, "member", {
    withPassword: true,
    key: { claimed: true },
  });
  return { ...person, resetKey: await addResetKey(db, person.id) };
}

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Sends `max` requests from one client address, each let through, then one
 * more, and resolves with that last response.
 */
export async function exhaustRateLimit(
  send: (address: string) => Promise<Response>,
  max: number,
): Promise<Response> {
  const address = newClientAddress();
  for (let count = 0; count < max; count += 1) {
    const response = await send(address);
    expect(response.status).not.toBe(429);
  }
  return send(address);
}
