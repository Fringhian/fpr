import { z } from "zod";

/**
 * The variables this process reads now. Later tickets add the provider and
 * schedule variables listed in `docs/architecture/prices.md`.
 */
export const envSchema = z.object({
  /** The port it listens on. */
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  /** Postgres. */
  DATABASE_URL: z.string().min(1),
  /** The bearer token the API sends with every request except `/health`. */
  PRICES_TOKEN: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates the environment. Throws an error that names every variable that
 * is missing or invalid.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${problems}`);
  }
  return result.data;
}
