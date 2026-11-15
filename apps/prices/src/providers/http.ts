import type { Logger } from "pino";
import type { CallBudget } from "../market/budget.js";
import { ProviderError, type ProviderName } from "./provider.js";

/** The `fetch` a provider sends its requests with. Tests pass a mock. */
export type Fetch = typeof fetch;

export const providerTimeoutMs = 15_000;

/**
 * What a provider's requests share: its name, its logger, its `fetch`, and the
 * day's call budget every request is counted against.
 */
export interface ProviderHttp {
  provider: ProviderName;
  logger: Logger;
  fetch: Fetch;
  budget: CallBudget;
}

/** Fields that describe a call in its log line. Never the URL, which holds the key. */
export interface ProviderCallFields {
  symbols?: readonly string[];
  query?: string;
  from?: string;
  to?: string;
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
 * a decimal string. Counts its calls against the day's budget before sending
 * it, since the provider bills a request even when it fails. Logs one line per
 * call: the provider, the endpoint, what was asked, the calls billed, the
 * day's count, the status, and the duration. Rejects with a `ProviderError`:
 * `call_budget_used`, unsent, when the calls would pass the day's cap,
 * `not_found` on a 404, `unavailable` on any other failure.
 */
export async function callProvider(
  http: ProviderHttp,
  call: {
    /** The provider's endpoint, such as `eod`, logged with the call. */
    endpoint: string;
    /** The full request URL, with the key. It is never logged. */
    url: URL;
    /** The calls the provider bills for this request. */
    calls: number;
    fields: ProviderCallFields;
  },
): Promise<unknown> {
  const fields = {
    provider: http.provider,
    endpoint: call.endpoint,
    ...call.fields,
    calls: call.calls,
  };
  if (!http.budget.trySpend(call.calls)) {
    http.logger.warn(
      { ...fields, ...http.budget.logFields() },
      "provider call refused: daily call cap reached",
    );
    throw new ProviderError(
      "call_budget_used",
      `${http.provider} ${call.endpoint}: daily call cap reached`,
    );
  }
  const line = { ...fields, callsToday: http.budget.spent() };
  const started = performance.now();
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
