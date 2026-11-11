import { z } from "zod";

/**
 * The variables this process reads now. Later tickets add the rest of the
 * list in `docs/architecture/api.md`.
 */
export const envSchema = z.object({
  /** The port it listens on. */
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  /** Postgres. */
  DATABASE_URL: z.string().min(1),
  /** The instance's origin, used for links and the origin check. */
  PUBLIC_URL: z.url(),
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
