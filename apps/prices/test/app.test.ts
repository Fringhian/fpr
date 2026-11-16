import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Writable } from "node:stream";
import { type Db, ping } from "@fpr/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { createLogger } from "../src/logger.js";
import type { Pricing } from "../src/pricing/pricing.js";

vi.mock("@fpr/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@fpr/db")>();
  return { ...actual, ping: vi.fn() };
});

const pingMock = vi.mocked(ping);
const TOKEN = "test-token";

interface Running {
  url: string;
  rawLines: string[];
  close(): Promise<void>;
}

/** Starts the app on a random local port and captures its log output. */
async function serve(): Promise<Running> {
  const rawLines: string[] = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      rawLines.push(chunk.toString());
      callback();
    },
  });
  // A pool that is never reached: these routes answer before Postgres, or
  // fail on it as an unexpected error.
  const deps = {
    db: {} as Db,
    timeZone: "Europe/Paris",
    now: () => new Date("2026-03-04T10:00:00+01:00"),
  };
  const app = createApp({
    logger: createLogger({ destination }),
    token: TOKEN,
    pricing: { deps } as unknown as Pricing,
  });
  const server: Server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    rawLines,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

let running: Running | undefined;

beforeEach(() => {
  pingMock.mockReset();
});

afterEach(async () => {
  await running?.close();
  running = undefined;
});

describe("GET /health", () => {
  it("answers 200 when Postgres answers, with no token", async () => {
    pingMock.mockResolvedValue(undefined);
    running = await serve();

    const response = await fetch(`${running.url}/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("answers 503 without internals when Postgres does not answer", async () => {
    pingMock.mockRejectedValue(new Error("password authentication failed"));
    running = await serve();

    const response = await fetch(`${running.url}/health`);
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(body).not.toContain("password");
    expect(JSON.parse(body)).toEqual({ status: "unavailable" });
  });
});

describe("token authentication", () => {
  it("answers 401 unauthenticated without the exact token", async () => {
    running = await serve();

    for (const headers of [
      {},
      { Authorization: "Bearer wrong-token" },
      { Authorization: `Bearer ${TOKEN.slice(0, -1)}` },
    ]) {
      const response = await fetch(`${running.url}/anything`, { headers });

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        error: { code: "unauthenticated" },
      });
    }
  });

  it("passes the request on with the right token, to the 404 handler", async () => {
    running = await serve();

    const response = await fetch(`${running.url}/anything`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "not_found" } });
  });
});

describe("request logging", () => {
  it("sets X-Request-Id and logs the request id, method and status", async () => {
    pingMock.mockResolvedValue(undefined);
    running = await serve();

    const response = await fetch(`${running.url}/health`);
    const requestId = response.headers.get("x-request-id");

    expect(requestId).toMatch(/^[0-9a-f-]{36}$/);
    const lines = running.rawLines
      .join("")
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    const requestLine = lines.find(
      (line) => (line.req as { id?: unknown } | undefined)?.id === requestId,
    );
    expect(requestLine).toMatchObject({
      req: { method: "GET" },
      res: { statusCode: 200 },
      route: "/health",
    });
  });

  it("logs a refusal at info with its code and an invalid request's issue paths, and an unexpected failure at error with its stack", async () => {
    running = await serve();
    const post = (body: Record<string, unknown>) =>
      fetch(`${running?.url}/shares/manual`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isin: "QZ0EXAMPLE16",
          name: "Example Certificate",
          priceEur: "40.10",
          at: "2026-03-02T05:10:00+01:00",
          createdBy: "01900000-0000-7000-8000-000000000000",
          ...body,
        }),
      });

    const future = await post({ at: "2026-03-05T10:00:00+01:00" });
    const invalid = await post({ priceEur: "secret-value-12" });
    const broken = await post({});

    expect([future.status, invalid.status, broken.status]).toEqual([
      422, 400, 500,
    ]);
    const lines = running.rawLines
      .join("")
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    const lineOf = (response: Response) =>
      lines.find(
        (line) =>
          line.requestId === response.headers.get("x-request-id") &&
          line.message !== "request completed",
      );
    expect(lineOf(future)).toEqual(
      expect.objectContaining({
        level: "info",
        code: "future_moment",
        message: "request refused",
      }),
    );
    expect(lineOf(future)).not.toHaveProperty("err");
    expect(lineOf(invalid)).toMatchObject({
      level: "info",
      code: "invalid_request",
      issues: [["priceEur"]],
    });
    expect(JSON.stringify(lineOf(invalid))).not.toContain("secret-value-12");
    expect(lineOf(broken)).toMatchObject({
      level: "error",
      message: "unexpected error",
      err: { stack: expect.stringContaining("Error") },
    });
  });

  it("never logs the token", async () => {
    running = await serve();

    await fetch(`${running.url}/anything`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });

    expect(running.rawLines.join("")).not.toContain(TOKEN);
  });

  it("redacts the token, passwords and the Authorization header in any log line", () => {
    const lines: string[] = [];
    const logger = createLogger({
      destination: new Writable({
        write(chunk, _encoding, callback) {
          lines.push(chunk.toString());
          callback();
        },
      }),
    });

    logger.info(
      {
        PRICES_TOKEN: "secret-token",
        password: "hunter2",
        headers: { authorization: "Bearer secret-token" },
      },
      "event",
    );

    const output = lines.join("");
    expect(output).not.toContain("secret-token");
    expect(output).not.toContain("hunter2");
  });
});
