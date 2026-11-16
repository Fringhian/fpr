/**
 * Helpers for the tests that run the app on a test database: the app on a
 * local port, people with each role, and signing them in. Not part of the
 * build.
 */
import { randomBytes, randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Readable, Writable } from "node:stream";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  type GetObjectRequest,
  NoSuchKey,
  PutObjectCommand,
  type PutObjectRequest,
  S3Client,
} from "@aws-sdk/client-s3";
import { pricesContract } from "@fpr/contracts/prices";
import { accessKeys, type Db, type Role, type Share, users } from "@fpr/db";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { type AnyRouter, implement } from "@orpc/server";
import { sdkStreamMixin } from "@smithy/util-stream";
import { type AwsClientStub, mockClient } from "aws-sdk-client-mock";
import sharp from "sharp";
import type { z } from "zod";
import { createApp } from "../src/app.js";
import { type Auth, createAuth } from "../src/auth/auth.js";
import { createLogger } from "../src/logger.js";
import { toErrorBody } from "../src/orpc.js";
import {
  createPricesClient,
  type PricesClient,
} from "../src/prices/prices-client.js";
import { pseudonyms } from "../src/pseudonyms/pseudonyms.js";
import {
  type AvatarStore,
  createAvatarStore,
} from "../src/storage/avatar-store.js";
import type { SeriesCache } from "../src/valuation/series-cache.js";

export const TEST_PUBLIC_URL = "https://fpr.example.test";

export const TEST_PASSWORD = "a long enough password";

export const SESSION_COOKIE = "__Secure-better-auth.session_token";

/** `ADMIN_BOOTSTRAP_KEY` in tests. */
export const TEST_BOOTSTRAP_KEY =
  "a-test-bootstrap-key-of-at-least-32-characters";

/** `PSEUDONYM_SECRET` in tests. */
export const TEST_PSEUDONYM_SECRET =
  "a-test-pseudonym-secret-of-at-least-32-characters";

/** `RACE_TIMEZONE` in tests. */
export const TEST_RACE_TIMEZONE = "Europe/Paris";

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

/** A bucket in memory, behind a mocked S3 client. */
export interface TestBucket {
  /** The pictures it holds, by object key. */
  objects: Map<string, { body: Uint8Array; contentType: string }>;
  /** The mocked client, to make a call fail or read the calls made. */
  client: AwsClientStub<S3Client>;
  avatars: AvatarStore;
}

/**
 * An `AvatarStore` on a mocked S3 client that keeps objects in memory, so
 * the API's S3 calls run without a bucket.
 */
export function createTestBucket(): TestBucket {
  const objects: TestBucket["objects"] = new Map();
  const s3 = new S3Client({ region: "auto" });
  const client = mockClient(s3);
  client.on(PutObjectCommand).callsFake(async (input: PutObjectRequest) => {
    const body = input.Body;
    if (!(body instanceof Uint8Array) || input.Key === undefined) {
      throw new Error("The test bucket takes bytes at a key");
    }
    objects.set(input.Key, {
      body,
      contentType: input.ContentType ?? "application/octet-stream",
    });
    return {};
  });
  client.on(GetObjectCommand).callsFake(async (input: GetObjectRequest) => {
    const object = objects.get(input.Key ?? "");
    if (object === undefined) {
      throw new NoSuchKey({ message: "No such key", $metadata: {} });
    }
    return {
      Body: sdkStreamMixin(Readable.from([object.body])),
      ContentType: object.contentType,
    };
  });
  client.on(DeleteObjectCommand).callsFake(async (input) => {
    objects.delete(input.Key ?? "");
    return {};
  });
  return { objects, client, avatars: createAvatarStore(s3, "test-bucket") };
}

/**
 * Answers for the price service's routes, by their key in `pricesContract`.
 * One throws `apiError(code)` to refuse, as the price service does.
 */
export type TestPriceRoutes = {
  [Key in keyof PricesClient]?: (
    input: Parameters<PricesClient[Key]>[0],
  ) => Promise<Awaited<ReturnType<PricesClient[Key]>>>;
};

/**
 * A price service in memory. A route set in `routes` is served through
 * oRPC from `pricesContract`, its refusals in FPR's error format; any other
 * answers `200 {}`.
 */
export interface TestPrices {
  prices: PricesClient;
  routes: TestPriceRoutes;
  /** Each request it got: method, path, and JSON body. */
  requests: { method: string; path: string; body: unknown }[];
  /** Forgets the routes set and the requests got. */
  reset(): void;
}

function fakePricesHandler(routes: TestPriceRoutes) {
  const fake = implement(pricesContract);
  const router = Object.fromEntries(
    Object.entries(routes).map(([key, answer]) => [
      key,
      (
        fake[key as keyof PricesClient] as unknown as {
          handler(fn: (options: { input: unknown }) => unknown): unknown;
        }
      ).handler(({ input }) => (answer as (input: unknown) => unknown)(input)),
    ]),
  ) as AnyRouter;
  return new OpenAPIHandler(router, {
    customErrorResponseBodyEncoder: toErrorBody,
  });
}

export function createTestPrices(routes: TestPriceRoutes = {}): TestPrices {
  const requests: TestPrices["requests"] = [];
  const prices = createPricesClient({
    url: "http://prices.test",
    token: "a-test-prices-token",
    fetch: async (input) => {
      const request = input instanceof Request ? input : new Request(input);
      const text = await request.clone().text();
      requests.push({
        method: request.method,
        path: new URL(request.url).pathname,
        body: text === "" ? undefined : JSON.parse(text),
      });
      const { matched, response } =
        await fakePricesHandler(routes).handle(request);
      return matched ? response : Response.json({});
    },
  });
  return {
    prices,
    routes,
    requests,
    reset() {
      for (const key of Object.keys(routes)) {
        delete routes[key as keyof TestPriceRoutes];
      }
      requests.length = 0;
    },
  };
}

/** Starts the app on a random local port and captures its log lines. */
export async function serveApp(options: {
  db: Db;
  auth: Auth;
  router?: AnyRouter;
  /** The picture storage. Defaults to an empty test bucket. */
  avatars?: AvatarStore;
  /** The balance series. Defaults to one on `db`. */
  series?: SeriesCache;
  /** The price service. Defaults to one that records the requests it gets. */
  prices?: PricesClient;
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
    avatars: options.avatars ?? createTestBucket().avatars,
    prices: options.prices ?? createTestPrices().prices,
    publicUrl: TEST_PUBLIC_URL,
    bootstrapKey: TEST_BOOTSTRAP_KEY,
    pseudonymSecret: TEST_PSEUDONYM_SECRET,
    raceTimeZone: TEST_RACE_TIMEZONE,
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

/**
 * A request to an API route as the instance's pages send it: from
 * `PUBLIC_URL`, with the session `cookie` when given, and a JSON body unless
 * `body` is bytes, sent with `contentType`.
 */
export function apiRequest(
  server: TestServer,
  path: string,
  init: {
    method?: string;
    cookie?: string;
    body?: unknown;
    contentType?: string;
  } = {},
): Promise<Response> {
  const { method = "GET", cookie, body, contentType } = init;
  const raw = body instanceof Uint8Array;
  const headers: Record<string, string> = {
    Origin: TEST_PUBLIC_URL,
    "X-Forwarded-For": newClientAddress(),
    ...(cookie === undefined ? {} : { Cookie: cookie }),
    ...(body === undefined
      ? {}
      : { "Content-Type": contentType ?? "application/json" }),
  };
  return fetch(`${server.url}/api${path}`, {
    method,
    headers,
    ...(body === undefined
      ? {}
      : { body: raw ? new Blob([body]) : JSON.stringify(body) }),
  });
}

/**
 * A response body, parsed with its route's output schema in
 * `@fpr/contracts`, such as `parseOutput(apiContract.me.get, body)`.
 */
export function parseOutput<Schema extends z.ZodType>(
  procedure: { "~orpc": { outputSchema?: Schema } },
  body: unknown,
): z.output<Schema> {
  const schema = procedure["~orpc"].outputSchema;
  if (schema === undefined) {
    throw new Error("The route declares no response");
  }
  return schema.parse(body);
}

/**
 * A generated picture of one colour, `width` by `height`, in a format the
 * API takes. Never a photo of anyone.
 */
export function testPicture(
  format: "jpeg" | "png" | "webp",
  { width = 64, height = 48 }: { width?: number; height?: number } = {},
): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 40, g: 120, b: 200 },
    },
  })
    .toFormat(format)
    .toBuffer();
}

/** The pseudonym an anonymous viewer sees for this person, from everyone on the database. */
export async function pseudonymOf(db: Db, userId: string): Promise<string> {
  const names = pseudonyms(TEST_PSEUDONYM_SECRET, await users.listIds(db));
  return names.get(userId) ?? "";
}

/** Adds a person with this role, signs them in, and resolves with their session's cookie. */
export async function addSignedIn(
  server: TestServer,
  db: Db,
  auth: Auth,
  role: Role,
): Promise<TestPerson & { cookie: string }> {
  const person = await addPerson(db, auth, role);
  return { ...person, cookie: await signIn(server, person) };
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

let isinCount = 0;

/** Adds a share, a market one unless told otherwise, with a made-up ISIN. */
export async function addShare(
  db: Db,
  kind: "market" | "manual" = "market",
): Promise<Share> {
  isinCount += 1;
  const code = String(isinCount).padStart(9, "0");
  return db
    .insertInto("shares")
    .values({
      isin: `FR${code}0`,
      name: `Example share ${isinCount}`,
      kind,
      tradingCurrency: kind === "market" ? "EUR" : null,
      providerSymbol: kind === "market" ? `EX${isinCount}.PA` : null,
      exchange: kind === "market" ? "PA" : null,
      historyStartsOn: null,
      createdBy: null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}
