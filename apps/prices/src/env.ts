import { z } from "zod";
import { providerNames } from "./providers/index.js";

/**
 * The variables this process reads now. Later tickets add the schedule
 * variables listed in `docs/architecture/prices.md`.
 */
export const envSchema = z.object({
  /** The port it listens on. */
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  /** Postgres. */
  DATABASE_URL: z.string().min(1),
  /** The bearer token the API sends with every request except `/health`. */
  PRICES_TOKEN: z.string().min(1),
  /** The price provider implementation. */
  PRICE_PROVIDER: z.enum(providerNames),
  /** The price provider's API key. */
  PRICE_PROVIDER_API_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates the environment. An empty variable counts as unset, so it takes
 * its default or is reported missing. Throws an error that names every
 * variable that is missing or invalid.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const set = Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== ""),
  );
  const result = envSchema.safeParse(set);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${problems}`);
  }
  return result.data;
}
