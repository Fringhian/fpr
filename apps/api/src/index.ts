import type { Server } from "node:http";
import { close, createDb, type Db } from "@fpr/db";
import type { Logger } from "pino";
import { createApp } from "./app.js";
import { createAuth } from "./auth/auth.js";
import { loadEnv } from "./env.js";
import { createLogger } from "./logger.js";
import { createAvatarStore, createS3Client } from "./storage/avatar-store.js";

function main(): void {
  const env = loadEnvOrExit();
  const logger = createLogger();
  const db = createDb({
    url: env.DATABASE_URL,
    onIdleError: (error) =>
      logger.error({ err: error }, "idle database connection failed"),
  });
  const auth = createAuth({
    db,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.PUBLIC_URL,
    logger,
  });
  const avatars = createAvatarStore(
    createS3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    }),
    env.S3_BUCKET,
  );
  const app = createApp({
    db,
    auth,
    avatars,
    publicUrl: env.PUBLIC_URL,
    logger,
    docs: process.env.NODE_ENV === "development",
  });
  const server: Server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "api listening");
  });
  shutDownOnSignal({ server, db, logger });
}

function loadEnvOrExit(): ReturnType<typeof loadEnv> {
  try {
    return loadEnv();
  } catch (error) {
    // The logger is not built yet, so the problem goes to standard error.
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function shutDownOnSignal({
  server,
  db,
  logger,
}: {
  server: Server;
  db: Db;
  logger: Logger;
}): void {
  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info({ signal }, "shutting down");

    // Stops accepting connections and waits for requests in flight.
    server.close((serverError) => {
      if (serverError) {
        logger.error({ err: serverError }, "HTTP server did not close cleanly");
      }
      close(db)
        .then(() => {
          logger.info("database pool closed");
          process.exit(serverError ? 1 : 0);
        })
        .catch((closeError: unknown) => {
          logger.error({ err: closeError }, "database pool did not close");
          process.exit(1);
        });
    });
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main();
