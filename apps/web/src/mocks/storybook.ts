import { createMockHandlers, type MockApiOptions } from "./handlers.ts";

/**
 * The stories' clock: a Wednesday at 15:10 in Paris, while the market is
 * open, so today's points are provisional and every story draws the same
 * data.
 */
export const storyNow = new Date("2026-03-04T14:10:00Z");

/**
 * A story's `parameters.msw`: the mock API on a store of its own, signed in
 * as `session`, on the stories' clock. A story overrides one route by
 * putting its own MSW handler first.
 *
 * ```ts
 * parameters: { msw: mockApi({ session: "anonymous" }) }
 * ```
 */
export function mockApi(options: Omit<MockApiOptions, "origin"> = {}) {
  const { handlers } = createMockHandlers({
    now: storyNow,
    origin: window.location.origin,
    ...options,
  });
  return { handlers };
}
