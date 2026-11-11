import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createLogger, redactPaths } from "./logger.js";

function capture(): { lines: string[]; destination: Writable } {
  const lines: string[] = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  return { lines, destination };
}

describe("createLogger", () => {
  it("writes one JSON line with time, level, service and message", () => {
    const { lines, destination } = capture();
    createLogger({ destination }).info("hello");

    expect(lines).toHaveLength(1);
    const line = JSON.parse(lines[0] ?? "") as Record<string, unknown>;
    expect(line.service).toBe("prices");
    expect(line.level).toBe("info");
    expect(line.message).toBe("hello");
    expect(typeof line.time).toBe("number");
  });

  it("redacts the token, passwords and the Authorization header", () => {
    const { lines, destination } = capture();
    createLogger({ destination }).info(
      {
        PRICES_TOKEN: "secret-token",
        password: "hunter2",
        headers: { authorization: "Bearer secret-token" },
      },
      "event",
    );

    const raw = lines.join("");
    expect(raw).not.toContain("secret-token");
    expect(raw).not.toContain("hunter2");
  });

  it("lists every secret field in its redact paths", () => {
    expect(redactPaths).toEqual(
      expect.arrayContaining([
        "PRICES_TOKEN",
        "*.PRICES_TOKEN",
        "authorization",
        "*.headers.authorization",
        "password",
      ]),
    );
  });
});
