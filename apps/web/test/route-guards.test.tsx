// @vitest-environment happy-dom
import type { Id } from "@fpr/contracts";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { getResponse } from "msw";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createApiClient } from "../src/lib/api/client.ts";
import { createQueryClient } from "../src/lib/api/query-client.ts";
import { createI18n } from "../src/lib/i18n.ts";
import { fixturePersonId } from "../src/mocks/fixtures/people.ts";
import { createMockHandlers } from "../src/mocks/handlers.ts";
import type { Persona } from "../src/mocks/personas.ts";
import { createAppRouter } from "../src/router.ts";

const origin = "http://fpr.test";
const roots: Root[] = [];

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

afterEach(() => {
  for (const root of roots.splice(0)) {
    act(() => root.unmount());
  }
  document.body.replaceChildren();
});

/**
 * The app at `path`, on the mock API signed in as `session`, once its routes
 * have loaded and rendered. `failMe` answers `GET /me` with a server error.
 */
async function visit(
  path: string,
  session: Persona | Id,
  { failMe = false }: { failMe?: boolean } = {},
) {
  const { handlers } = createMockHandlers({ origin, session });
  const onAccessEnded = vi.fn();
  const api = createTanstackQueryUtils(
    createApiClient({
      url: `${origin}/api`,
      fetch: async (request) =>
        failMe && new URL(request.url).pathname === "/api/me"
          ? new Response(null, { status: 502 })
          : ((await getResponse(handlers, request)) ?? Response.error()),
      onAccessEnded,
    }),
  );
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  const router = createAppRouter({
    queryClient,
    api,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  const page = document.createElement("div");
  document.body.append(page);
  const root = createRoot(page);
  roots.push(root);
  await act(async () => {
    await router.load();
    root.render(
      <I18nextProvider i18n={createI18n("en")}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </I18nextProvider>,
    );
  });
  return {
    location: router.state.location,
    /** The search the page reads, once its route validated it. */
    search: router.state.matches.at(-1)?.search,
    text: page.textContent ?? "",
    onAccessEnded,
  };
}

const userId = fixturePersonId("sam");

/** Every route, by the address a visit asks for. */
const routes = {
  home: "/",
  members: "/members",
  member: `/members/${userId}`,
  memberRecord: `/members/${userId}/record`,
  portfolio: "/portfolio",
  portfolioRecord: "/portfolio/record",
  portfolioHistory: "/portfolio/history",
  shares: "/shares",
  share: "/shares/0b8a4c62-5d1e-4f0a-9c3e-2a7f6b1d9e40",
  help: "/help",
  people: "/admin/people",
  trackedShares: "/admin/shares",
  signIn: "/sign-in",
  setup: "/setup",
  access: "/access/some-key",
  resetPassword: "/reset-password",
  onboarding: "/onboarding",
} as const;

type Page = keyof typeof routes;

const pages = Object.keys(routes) as Page[];
const everyday = ["home", "members", "member", "shares", "share", "help"];
const portfolio = ["portfolio", "portfolioRecord", "portfolioHistory"];
const adminArea = ["people", "trackedShares"];

/** The pages each onboarded persona enters; every other page leads Home. */
const enters = {
  admin: [...everyday, ...portfolio, ...adminArea, "memberRecord"],
  member: [...everyday, ...portfolio],
  guest: everyday,
  anonymous: [...everyday, ...adminArea],
} satisfies Partial<Record<Persona, readonly string[]>>;

describe("the route guards", () => {
  describe.each(Object.keys(enters) as (keyof typeof enters)[])(
    "for the %s",
    (persona) => {
      it.each(pages)("lead from %s where the role may go", async (page) => {
        const allowed: readonly string[] = enters[persona];
        const { location } = await visit(routes[page], persona);
        expect(location.href).toBe(allowed.includes(page) ? routes[page] : "/");
      });
    },
  );

  it("send a signed-out visitor to sign-in, which leads back to the page asked for", async () => {
    const { location, search } = await visit("/shares?q=world", "signedOut");
    expect(location.pathname).toBe("/sign-in");
    expect(search).toEqual({ redirect: "/shares?q=world" });
    expect((await visit("/", "signedOut")).location.href).toBe("/sign-in");
    expect((await visit("/onboarding", "signedOut")).location.pathname).toBe(
      "/sign-in",
    );
  });

  it("let a signed-out visitor reach every page that starts a session", async () => {
    for (const page of [
      "signIn",
      "setup",
      "access",
      "resetPassword",
    ] as const) {
      expect((await visit(routes[page], "signedOut")).location.href).toBe(
        routes[page],
      );
    }
  });

  it("keep sign-in's redirect inside the app", async () => {
    const { search } = await visit(
      "/sign-in?redirect=//elsewhere.example",
      "signedOut",
    );
    expect(search).toEqual({});
  });

  it("send a person whose onboarding isn't finished to it from every other page", async () => {
    for (const page of pages) {
      expect((await visit(routes[page], "newcomer")).location.href).toBe(
        "/onboarding",
      );
    }
  });

  it("sign out a person whose access has ended, and tell them on sign-in", async () => {
    const ended = await visit("/portfolio", fixturePersonId("sacha"));
    expect(ended.onAccessEnded).toHaveBeenCalled();
    expect(ended.location.pathname).toBe("/sign-in");

    const { text } = await visit("/sign-in?access=ended", "signedOut");
    expect(text).toContain("Your access has ended");
    expect(text).toContain("Ask the admin if you think this is a mistake.");
  });

  it("open the admin area on People", async () => {
    expect((await visit("/admin", "admin")).location.href).toBe(
      "/admin/people",
    );
  });

  it("show Page not found at an address no route answers", async () => {
    const { location, text } = await visit("/nowhere", "member");
    expect(location.pathname).toBe("/nowhere");
    expect(text).toContain("Page not found");
  });

  it("show Retry when the session can't load", async () => {
    const { text } = await visit("/", "member", { failMe: true });
    expect(text).toContain("Can’t load this page");
    expect(text).toContain("Retry");
  });
});
