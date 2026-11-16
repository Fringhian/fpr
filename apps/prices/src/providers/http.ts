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

interface ProviderCall {
  /** The provider's endpoint, such as `eod`, logged with the call. */
  endpoint: string;
  /** The full request URL, with the key. It is never logged. */
  url: URL;
  /** The calls the provider bills for this request. */
  calls: number;
  fields: ProviderCallFields;
}

/** A sent call: what each of its log lines carries, and when it started. */
interface SentCall {
  http: ProviderHttp;
  endpoint: string;
  line: Record<string, unknown>;
  started: number;
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
  call: ProviderCall,
): Promise<unknown> {
  const fields = {
    provider: http.provider,
    endpoint: call.endpoint,
    ...call.fields,
    calls: call.calls,
  };
  spendCalls(http, call, fields);
  const sent: SentCall = {
    http,
    endpoint: call.endpoint,
    line: { ...fields, callsToday: http.budget.spent() },
    started: performance.now(),
  };
  const response = await send(sent, call.url);
  await rejectFailedStatus(sent, response);
  const body = await readBody(sent, response);
  http.logger.info(
    { ...sent.line, status: response.status, duration: elapsed(sent) },
    "provider call",
  );
  return body;
}

/** Counts the call against the day's budget, or refuses it unsent. */
function spendCalls(
  http: ProviderHttp,
  call: ProviderCall,
  fields: Record<string, unknown>,
): void {
  if (http.budget.trySpend(call.calls)) {
    return;
  }
  http.logger.warn(
    { ...fields, ...http.budget.logFields() },
    "provider call refused: daily call cap reached",
  );
  throw new ProviderError(
    "call_budget_used",
    `${http.provider} ${call.endpoint}: daily call cap reached`,
  );
}

async function send(sent: SentCall, url: URL): Promise<Response> {
  try {
    return await sent.http.fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(providerTimeoutMs),
    });
  } catch (error) {
    sent.http.logger.error(
      { ...sent.line, duration: elapsed(sent), err: error },
      "provider call failed: no response",
    );
    throw new ProviderError(
      "unavailable",
      `${sent.http.provider} ${sent.endpoint}: no response`,
      { cause: error },
    );
  }
}

async function rejectFailedStatus(
  sent: SentCall,
  response: Response,
): Promise<void> {
  const { status } = response;
  if (response.ok) {
    return;
  }
  await response.body?.cancel();
  const reason = status === 404 ? "not_found" : "unavailable";
  sent.http.logger[reason === "not_found" ? "warn" : "error"](
    { ...sent.line, status, duration: elapsed(sent) },
    `provider call failed: ${status}`,
  );
  throw new ProviderError(
    reason,
    `${sent.http.provider} ${sent.endpoint}: HTTP ${status}`,
    { status },
  );
}

async function readBody(sent: SentCall, response: Response): Promise<unknown> {
  const { status } = response;
  try {
    return parseJsonExact(await response.text());
  } catch (error) {
    sent.http.logger.error(
      { ...sent.line, status, duration: elapsed(sent), err: error },
      "provider call failed: unreadable body",
    );
    throw new ProviderError(
      "unavailable",
      `${sent.http.provider} ${sent.endpoint}: unreadable body`,
      { status, cause: error },
    );
  }
}

function elapsed(sent: SentCall): number {
  return Math.round(performance.now() - sent.started);
}
