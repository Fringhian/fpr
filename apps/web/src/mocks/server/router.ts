import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { ORPCError, onError } from "@orpc/server";
import { accessRoutes } from "../domains/access.ts";
import { accessControlRoutes } from "../domains/admin/access.ts";
import { peopleRoutes } from "../domains/admin/people.ts";
import { refreshRoutes } from "../domains/admin/refresh.ts";
import { adminShareRoutes } from "../domains/admin/shares.ts";
import { meRoutes } from "../domains/me.ts";
import { cashWrites } from "../domains/portfolio/cash.ts";
import { changeWrites } from "../domains/portfolio/changes.ts";
import { portfolioReads } from "../domains/portfolio/reads.ts";
import { raceRoutes } from "../domains/race.ts";
import { manualShareWrites } from "../domains/shares/manual.ts";
import { shareReads } from "../domains/shares/reads.ts";
import { valueWrites } from "../domains/shares/values.ts";
import type { MockStore } from "../store/types.ts";
import { toErrorBody } from "./errors.ts";
import { type MockContext, mock } from "./implementer.ts";

/** Every route of `apiContract`: the router fails to type-check while one is missing. */
const mockRouter = mock.router({
  access: accessRoutes,
  me: meRoutes,
  portfolio: { ...portfolioReads, ...changeWrites, ...cashWrites },
  shares: { ...shareReads, ...manualShareWrites, ...valueWrites },
  race: raceRoutes,
  admin: {
    ...peopleRoutes,
    ...accessControlRoutes,
    ...adminShareRoutes,
    ...refreshRoutes,
  },
});

/**
 * The mock API as a fetch handler under `/api`, routed, decoded and
 * validated by oRPC from the contracts as the API is, and answering errors in
 * FPR's format. A response that breaks its contract answers `internal_error`
 * and logs why.
 */
export function createMockApi(store: MockStore, origin: string) {
  const handler = new OpenAPIHandler<MockContext>(mockRouter, {
    customErrorResponseBodyEncoder: toErrorBody,
    interceptors: [
      onError((error) => {
        if (
          error instanceof ORPCError &&
          error.code === "INTERNAL_SERVER_ERROR"
        ) {
          console.error(
            "[mock API] a response broke its contract",
            error.cause ?? error,
          );
        }
      }),
    ],
  });
  return async (request: Request): Promise<Response | undefined> => {
    const { matched, response } = await handler.handle(request, {
      prefix: "/api",
      context: { store, origin },
    });
    return matched ? response : undefined;
  };
}
