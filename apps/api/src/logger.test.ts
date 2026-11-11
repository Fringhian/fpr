import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createLogger } from "./logger.js";

/** Collects every line the logger writes. */
function capture() {
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
  it("writes one JSON line per event with time, level, service and message", () => {
    const { lines, destination } = capture();
    const logger = createLogger({ destination });

    logger.warn("disk almost full");

    expect(lines).toHaveLength(1);
    const line = JSON.parse(lines[0] ?? "");
    expect(line).toMatchObject({
      level: "warn",
      service: "api",
      message: "disk almost full",
    });
    expect(typeof line.time).toBe("number");
  });

  it("redacts passwords, access keys, reset keys and cookies", () => {
    const { lines, destination } = capture();
    const logger = createLogger({ destination });

    logger.info({
      password: "hunter2-test",
      accessKey: "access-test-value",
      resetKey: "reset-test-value",
      cookie: "session-test-value",
      user: {
        password: "nested-password-test",
        accessKey: "nested-access-test",
        resetKey: "nested-reset-test",
        cookie: "nested-cookie-test",
      },
      displayName: "Alex Example",
    });

    const output = lines.join("");
    for (const secret of [
      "hunter2-test",
      "access-test-value",
      "reset-test-value",
      "session-test-value",
      "nested-password-test",
      "nested-access-test",
      "nested-reset-test",
      "nested-cookie-test",
    ]) {
      expect(output).not.toContain(secret);
    }
    expect(output).toContain("Alex Example");
  });
});
