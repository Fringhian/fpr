import { z } from "zod";
import { providerNames } from "./providers/index.js";

/** The variables this process reads. `docs/architecture/prices.md` lists them all. */
export const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  /** The bearer token the API sends with every request except `/health`. */
  PRICES_TOKEN: z.string().min(1),
  PRICE_PROVIDER: z.enum(providerNames),
  PRICE_PROVIDER_API_KEY: z.string().min(1),
  /** The exchange-rate API, Frankfurter. */
  RATES_URL: z.url().default("https://api.frankfurter.dev"),
  PROVIDER_DAILY_CALL_LIMIT: z.coerce.number().int().min(1).default(1000),
  /** The race's time zone: the schedules and the call count's day follow it. */
  RACE_TIMEZONE: z
    .string()
    .refine(isTimeZone, "Expected an IANA time zone, such as Europe/Paris")
    .default("Europe/Paris"),
});

function isTimeZone(name: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: name });
    return true;
  } catch {
    return false;
  }
}

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
