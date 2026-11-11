import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Writable } from "node:stream";
import { type Db, ping } from "@fpr/db";
import type { Express } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";
import { createLogger } from "./logger.js";

vi.mock("@fpr/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@fpr/db")>();
  return { ...actual, ping: vi.fn() };
});

const pingMock = vi.mocked(ping);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

interface Running {
  url: string;
  lines: Record<string, unknown>[];
  rawLines: string[];
  close(): Promise<void>;
}

/** Starts the app on a random local port and captures its log lines. */
async function serve(routes?: (app: Express) => void): Promise<Running> {
  const rawLines: string[] = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      rawLines.push(chunk.toString());
      callback();
    },
  });
  const app = createApp({
    db: {} as Db,
    logger: createLogger({ destination }),
    ...(routes ? { routes } : {}),
  });
  const server: Server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    rawLines,
    get lines() {
      return rawLines.flatMap((chunk) =>
        chunk
          .split("\n")
          .filter((line) => line.length > 0)
          .map((line) => JSON.parse(line) as Record<string, unknown>),
      );
    },
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

describe("X-Request-Id", () => {
  it("is on every response, known or unknown route", async () => {
    running = await serve();

    const health = await fetch(`${running.url}/health`);
    const missing = await fetch(`${running.url}/nowhere`);

    expect(health.headers.get("x-request-id")).toMatch(UUID);
    expect(missing.headers.get("x-request-id")).toMatch(UUID);
  });

  it("is logged on the request line, with the method, route and status", async () => {
    pingMock.mockResolvedValue(undefined);
    running = await serve();

    const response = await fetch(`${running.url}/health`);
    const requestId = response.headers.get("x-request-id");

    const requestLine = running.lines.find(
      (line) => line.message === "request completed",
    );
    expect(requestLine).toMatchObject({
      level: "info",
      service: "api",
      req: { id: requestId, method: "GET" },
      route: "/health",
      res: { statusCode: 200 },
    });
    expect(typeof requestLine?.duration).toBe("number");
  });
});

describe("errors", () => {
  it("answers an unknown route with not_found", async () => {
    running = await serve();

    const response = await fetch(`${running.url}/nowhere`);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "not_found" } });
  });

  it("answers a thrown error with internal_error, logs it with its stack and request id", async () => {
    running = await serve((app) => {
      app.get("/boom", () => {
        throw new Error("database password is hunter2-test");
      });
    });

    const response = await fetch(`${running.url}/boom`);
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(body)).toEqual({ error: { code: "internal_error" } });
    expect(body).not.toContain("hunter2-test");

    const errorLine = running.lines.find(
      (line) => line.message === "unexpected error",
    );
    expect(errorLine).toMatchObject({
      level: "error",
      requestId: response.headers.get("x-request-id"),
    });
    const err = errorLine?.err as { stack?: string; message?: string };
    expect(err.message).toBe("database password is hunter2-test");
    expect(err.stack).toContain("Error: database password is hunter2-test");
  });
});

describe("GET /health", () => {
  it("answers 200 once Postgres answers", async () => {
    pingMock.mockResolvedValue(undefined);
    running = await serve();

    const response = await fetch(`${running.url}/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("answers 503 without internals when Postgres does not answer", async () => {
    pingMock.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5:5432"));
    running = await serve();

    const response = await fetch(`${running.url}/health`);
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(JSON.parse(body)).toEqual({ status: "unavailable" });
    expect(body).not.toContain("ECONNREFUSED");
    expect(body).not.toContain("10.0.0.5");
    expect(
      running.lines.some(
        (line) =>
          line.level === "error" &&
          line.message === "health check failed: Postgres did not answer",
      ),
    ).toBe(true);
  });
});

describe("trust proxy", () => {
  it("takes the client address from the hop web forwards", async () => {
    running = await serve((app) => {
      app.get("/ip", (req, res) => {
        res.json({ ip: req.ip });
      });
    });

    const response = await fetch(`${running.url}/ip`, {
      headers: { "X-Forwarded-For": "198.51.100.9, 203.0.113.7" },
    });

    expect(await response.json()).toEqual({ ip: "203.0.113.7" });
  });
});

describe("request logging", () => {
  it("never logs cookies or bodies", async () => {
    running = await serve();

    await fetch(`${running.url}/nowhere`, {
      method: "POST",
      headers: {
        Cookie: "session=cookie-test-value",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: "access-test-value",
        password: "hunter2-test",
      }),
    });

    const output = running.rawLines.join("");
    expect(output).not.toContain("cookie-test-value");
    expect(output).not.toContain("access-test-value");
    expect(output).not.toContain("hunter2-test");
  });
});
