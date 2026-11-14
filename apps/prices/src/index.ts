import type { Server } from "node:http";
import { close, createDb } from "@fpr/db";
import { createApp } from "./app.js";
import { loadEnv } from "./env.js";
import { createLogger } from "./logger.js";
import { createProvider } from "./providers/index.js";

function main(): void {
  let env: ReturnType<typeof loadEnv>;
  try {
    env = loadEnv();
  } catch (error) {
    // The logger is not built yet, so the problem goes to standard error.
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const logger = createLogger();
  const db = createDb({
    url: env.DATABASE_URL,
    onIdleError: (error) =>
      logger.error({ err: error }, "idle database connection failed"),
  });
  const provider = createProvider({
    name: env.PRICE_PROVIDER,
    apiKey: env.PRICE_PROVIDER_API_KEY,
    logger,
  });
  const app = createApp({ db, logger, token: env.PRICES_TOKEN });
  const server: Server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, provider: provider.name },
      "prices listening",
    );
  });

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
