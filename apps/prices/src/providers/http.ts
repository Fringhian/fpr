import type { Logger } from "pino";
import { ProviderError, type ProviderName } from "./provider.js";

/** The `fetch` a provider sends its requests with. Tests pass a mock. */
export type Fetch = typeof fetch;

/** A provider request takes at most this long before it counts as failed. */
export const providerTimeoutMs = 15_000;

/** What a provider's requests share: its name, its logger, and its `fetch`. */
export interface ProviderHttp {
  provider: ProviderName;
  logger: Logger;
  fetch: Fetch;
}

/** Fields that describe a call in its log line. Never the URL, which holds the key. */
export interface ProviderCallFields {
  symbols?: readonly string[];
  query?: string;
  from?: string;
  to?: string;
}

export interface ProviderCall {
  /** The provider's endpoint, such as `eod`, logged with the call. */
  endpoint: string;
  /** The full request URL, with the key. It is never logged. */
  url: URL;
  /** The calls the provider bills for this request. */
  calls: number;
  fields: ProviderCallFields;
}

/**
 * Parses JSON keeping every number as the exact text the provider sent, so a
 * price such as `74.3280` stays the decimal string `"74.3280"` and never goes
 * through a floating-point number.
 */
export function parseJsonExact(text: string): unknown {
  return JSON.parse(
    text,
    (_key: string, value: unknown, context?: { source?: string }) =>
      typeof value === "number" && context?.source !== undefined
        ? context.source
        : value,
  );
}

/**
 * Sends one provider request and returns its JSON body, with every number as
 * a decimal string. Logs one line per call: the provider, the endpoint, what
 * was asked, the calls billed, the status, and the duration. Rejects with a
 * `ProviderError`: `not_found` on a 404, `unavailable` on any other failure.
 */
export async function callProvider(
  http: ProviderHttp,
  call: ProviderCall,
): Promise<unknown> {
  const started = performance.now();
  const line = {
    provider: http.provider,
    endpoint: call.endpoint,
    ...call.fields,
    calls: call.calls,
  };
  const duration = (): number => Math.round(performance.now() - started);

  let response: Response;
  try {
    response = await http.fetch(call.url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(providerTimeoutMs),
    });
  } catch (error) {
    http.logger.error(
      { ...line, duration: duration(), err: error },
      "provider call failed: no response",
    );
    throw new ProviderError(
      "unavailable",
      `${http.provider} ${call.endpoint}: no response`,
      { cause: error },
    );
  }

  const { status } = response;
  if (!response.ok) {
    await response.body?.cancel();
    const reason = status === 404 ? "not_found" : "unavailable";
    http.logger[reason === "not_found" ? "warn" : "error"](
      { ...line, status, duration: duration() },
      `provider call failed: ${status}`,
    );
    throw new ProviderError(
      reason,
      `${http.provider} ${call.endpoint}: HTTP ${status}`,
      { status },
    );
  }

  let body: unknown;
  try {
    body = parseJsonExact(await response.text());
  } catch (error) {
    http.logger.error(
      { ...line, status, duration: duration(), err: error },
      "provider call failed: unreadable body",
    );
    throw new ProviderError(
      "unavailable",
      `${http.provider} ${call.endpoint}: unreadable body`,
      { status, cause: error },
    );
  }

  http.logger.info({ ...line, status, duration: duration() }, "provider call");
  return body;
}
