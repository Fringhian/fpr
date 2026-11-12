import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Writable } from "node:stream";
import {
  decimalSchema,
  errorMap,
  type InvalidRequestDetails,
  publicRoute,
} from "@fpr/contracts";
import { createOpenApiDocument } from "@fpr/contracts/openapi";
import { type Db, ping } from "@fpr/db";
import { type AnyRouter, implement } from "@orpc/server";
import type { Express } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createApp } from "./app.js";
import { createLogger } from "./logger.js";
import type { ApiContext } from "./orpc.js";

/** A contract and router used only here, to exercise inputs and errors. */
const testContract = {
  setAmount: publicRoute
    .errors(errorMap("invalid_request", "not_found"))
    .route({ method: "POST", path: "/things/{id}" })
    .input(z.object({ id: z.uuid(), amount: decimalSchema }))
    .output(z.object({ id: z.uuid(), amount: decimalSchema })),
  boom: publicRoute
    .route({ method: "GET", path: "/boom" })
    .output(z.object({})),
};
const testApi = implement(testContract).$context<ApiContext>();
const testRouter = testApi.router({
  setAmount: testApi.setAmount.handler(({ input, errors }) => {
    if (input.id === MISSING) {
      throw errors.not_found({ data: { id: input.id } });
    }
    return input;
  }),
  boom: testApi.boom.handler(() => {
    throw new Error("database password is hunter2-test");
  }),
});
const THING = "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70";
const MISSING = "1c7a4d2f-9b3e-4d8f-a021-3c4d5e6f7a81";

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
async function serve(
  routes?: (app: Express) => void,
  { docs = false, router }: { docs?: boolean; router?: AnyRouter } = {},
): Promise<Running> {
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
    docs,
    ...(router ? { router } : {}),
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

describe("contract routes", () => {
  it("answers GET /api/me with unauthenticated until sessions exist", async () => {
    running = await serve();

    const response = await fetch(`${running.url}/api/me`);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "unauthenticated" },
    });
    expect(response.headers.get("x-request-id")).toMatch(UUID);
  });

  it("validates the input and answers the handler's output", async () => {
    running = await serve(undefined, { router: testRouter });

    const response = await fetch(`${running.url}/api/things/${THING}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: "12.50" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: THING, amount: "12.50" });
  });

  it("answers an invalid input with invalid_request and each issue's path and code, without text", async () => {
    running = await serve(undefined, { router: testRouter });

    const response = await fetch(`${running.url}/api/things/not-a-uuid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 12.5 }),
    });
    const body = (await response.json()) as {
      error: { code: string; details: InvalidRequestDetails };
    };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("invalid_request");
    expect(Object.keys(body.error.details)).toEqual(["issues"]);
    // Compared whole, so a message or any other field fails it.
    expect(
      body.error.details.issues.toSorted((a, b) =>
        String(a.path).localeCompare(String(b.path)),
      ),
    ).toEqual([
      { path: ["amount"], code: "invalid_type" },
      { path: ["id"], code: "invalid_format" },
    ]);
  });

  it("answers a declared error with its status and details", async () => {
    running = await serve(undefined, { router: testRouter });

    const response = await fetch(`${running.url}/api/things/${MISSING}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: "1" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "not_found", details: { id: MISSING } },
    });
  });

  it("answers a thrown error with internal_error, logged with its stack", async () => {
    running = await serve(undefined, { router: testRouter });

    const response = await fetch(`${running.url}/api/boom`);
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
    expect(JSON.stringify(errorLine)).toContain("hunter2-test");
  });

  it("leaves an unknown /api route to Express's not_found", async () => {
    running = await serve();

    const response = await fetch(`${running.url}/api/nowhere`);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "not_found" } });
  });
});

describe("/api/docs", () => {
  it("serves the OpenAPI document generated from the contracts", async () => {
    running = await serve(undefined, { docs: true });

    const response = await fetch(`${running.url}/api/docs/openapi.json`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(await createOpenApiDocument());
  });

  it("serves a viewer that reads the document", async () => {
    running = await serve(undefined, { docs: true });

    const response = await fetch(`${running.url}/api/docs`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(await response.text()).toContain("/api/docs/openapi.json");
  });

  it("is not served unless asked, as outside development", async () => {
    running = await serve();

    const viewer = await fetch(`${running.url}/api/docs`);
    const document = await fetch(`${running.url}/api/docs/openapi.json`);

    expect(viewer.status).toBe(404);
    expect(document.status).toBe(404);
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
