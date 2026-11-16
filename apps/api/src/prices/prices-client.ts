import { errorSchema, type IsoDate } from "@fpr/contracts";
import { type PricesContract, pricesContract } from "@fpr/contracts/prices";
import { createORPCClient, ORPCError } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import { OpenAPILink } from "@orpc/openapi-client/fetch";
import type { Logger } from "pino";

/** The price service's routes, as typed calls: `prices.fillHistory({ id, from })`. */
export type PricesClient = ContractRouterClient<PricesContract>;

/**
 * Longer than the price service's 15-second provider timeout, so its own
 * answer arrives first.
 */
const TIMEOUT_MS = 20_000;

/**
 * A refresh asks the provider for missing closes, then for the latest prices,
 * one call after another, so it gets longer.
 */
const timeouts: Partial<Record<keyof PricesContract, number>> = {
  refresh: 120_000,
};

/**
 * The client of the price service at `PRICES_URL`, sending `PRICES_TOKEN`. A
 * refusal in FPR's error format fails as an `ORPCError` with its code, status
 * and details; `forwardRefusal` turns it into the API's answer.
 */
export function createPricesClient({
  url,
  token,
  fetch = globalThis.fetch,
}: {
  url: string;
  token: string;
  fetch?: typeof globalThis.fetch;
}): PricesClient {
  const link = new OpenAPILink(pricesContract, {
    url,
    headers: { Authorization: `Bearer ${token}` },
    fetch: (request, init, _options, path) => {
      const route = path[0] as keyof PricesContract | undefined;
      const timeout = (route && timeouts[route]) ?? TIMEOUT_MS;
      return fetch(request, { ...init, signal: AbortSignal.timeout(timeout) });
    },
    customErrorResponseBodyDecoder: (body, response) => {
      const parsed = errorSchema.safeParse(body);
      if (!parsed.success) {
        return null;
      }
      const { code, details } = parsed.data.error;
      return new ORPCError(code, { status: response.status, data: details });
    },
  });
  return createORPCClient(link);
}

/**
 * Asks the price service for a share's closes from a day, without waiting.
 * A failure is logged: the price service's next run fills them anyway.
 */
export function requestHistory(
  prices: PricesClient,
  logger: Logger,
  shareId: string,
  from: IsoDate,
): void {
  prices.fillHistory({ id: shareId, from }).catch((error: unknown) => {
    logger.error({ err: error, shareId, from }, "price history request failed");
  });
}
