import pino, { type DestinationStream, type Logger } from "pino";

/**
 * Fields that never reach a log line, whatever object they sit in: passwords,
 * access keys, reset keys, and session cookies.
 */
export const redactPaths = [
  "password",
  "*.password",
  "accessKey",
  "*.accessKey",
  "resetKey",
  "*.resetKey",
  "cookie",
  "*.cookie",
  "*.headers.cookie",
  '*.headers["set-cookie"]',
];

export interface CreateLoggerOptions {
  /** Where lines are written. Defaults to standard output. */
  destination?: DestinationStream;
}

/**
 * The process's logger: one JSON line per event, with the time, the level,
 * the service, and the message. In development the lines go through
 * `pino-pretty`.
 */
export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const config = {
    level: "info",
    base: { service: "api" },
    messageKey: "message",
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    redact: { paths: redactPaths, censor: "[Redacted]" },
  };

  if (options.destination) {
    return pino(config, options.destination);
  }
  if (process.env.NODE_ENV === "development") {
    return pino({ ...config, transport: { target: "pino-pretty" } });
  }
  return pino(config);
}
