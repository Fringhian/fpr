import type { ApiContract } from "@fpr/contracts";
import { createORPCClient, onError } from "@orpc/client";
import type { AnyContractRouter, ContractRouterClient } from "@orpc/contract";
import {
  OpenAPILink,
  type OpenAPILinkOptions,
} from "@orpc/openapi-client/fetch";
import routes from "./contract.gen.json";
import { decodeErrorBody, isApiError } from "./errors.ts";

/** Every API route as a typed call, such as `client.me.get()`. */
export type ApiClient = ContractRouterClient<ApiContract>;

/**
 * The API's client, typed by `@fpr/contracts`. A failed call throws an
 * `ORPCError` carrying the FPR code, status and details. Any call answered
 * `401 access_ended` runs `onAccessEnded` before it throws.
 */
export function createApiClient({
  url,
  fetch,
  onAccessEnded,
}: {
  /** The API's absolute base URL, such as `https://fpr.example.com/api`. */
  url: string;
  fetch?: OpenAPILinkOptions<object>["fetch"];
  onAccessEnded: () => void;
}): ApiClient {
  // Calls are routed by each route's method and path alone, from the
  // generated table, so no schema reaches the bundle.
  const link = new OpenAPILink(routes as AnyContractRouter, {
    url,
    ...(fetch === undefined ? {} : { fetch }),
    customErrorResponseBodyDecoder: decodeErrorBody,
    interceptors: [
      onError((error) => {
        if (isApiError(error, "access_ended")) {
          onAccessEnded();
        }
      }),
    ],
  });
  return createORPCClient(link);
}
