import pino, { type DestinationStream, type Logger } from "pino";

/**
 * Fields that never reach a log line, whatever object they sit in: passwords,
 * bearer tokens, and the Authorization header.
 */
export const redactPaths = [
  "password",
  "*.password",
  "token",
  "*.token",
  "PRICES_TOKEN",
  "*.PRICES_TOKEN",
  "authorization",
  "*.authorization",
  "*.headers.authorization",
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
    base: { service: "prices" },
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
