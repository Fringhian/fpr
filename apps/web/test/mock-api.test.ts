import { apiContract, contractProcedures, periods } from "@fpr/contracts";
import { getResponse } from "msw";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { type ApiClient, createApiClient } from "../src/lib/api/client.ts";
import {
  fixturePeople,
  fixturePersonId,
} from "../src/mocks/fixtures/people.ts";
import { fixtureShareId } from "../src/mocks/fixtures/shares.ts";
import {
  createMockHandlers,
  type MockApiOptions,
} from "../src/mocks/handlers.ts";
import { accessKeys, mockPassword } from "../src/mocks/magic.ts";

const origin = "http://fpr.test";
// A Wednesday at 15:10 in Paris: the market is open, with provisional points.
const now = new Date("2026-03-04T14:10:00Z");

/** A client whose calls the mock API's MSW handlers answer. */
function mockClient(options: Omit<MockApiOptions, "origin"> = {}) {
  const { handlers, store } = createMockHandlers({ now, origin, ...options });
  const client = createApiClient({
    url: `${origin}/api`,
    fetch: async (request) =>
      (await getResponse(handlers, request)) ?? Response.error(),
    onAccessEnded: () => {},
  });
  return { client, store, handlers };
}

const sam = fixturePersonId("sam");
const world = fixtureShareId("world");
const vineyard = fixtureShareId("vineyard");

/** One call of every read, named by its route. */
function reads(client: ApiClient): Record<string, () => Promise<unknown>> {
  return {
    "access.setupStatus": () => client.access.setupStatus(),
    "me.get": () => client.me.get(),
    "me.getAvatar": () =>
      client.me.getAvatar({ userId: fixturePersonId("alex") }),
    "portfolio.get": () => client.portfolio.get({ userId: sam, period: "1M" }),
    "portfolio.holdingAt": () =>
      client.portfolio.holdingAt({
        userId: sam,
        shareId: world,
        at: now.toISOString(),
      }),
    "portfolio.log": () => client.portfolio.log({ userId: sam, limit: 3 }),
    "portfolio.balanceHistory": () =>
      client.portfolio.balanceHistory({ userId: sam, period: "3M" }),
    "shares.search": () => client.shares.search({ q: "", period: "1M" }),
    "shares.get": () => client.shares.get({ id: world, period: "1M" }),
    "shares.prices": () => client.shares.prices({ id: world, range: "1W" }),
    "shares.holders": () => client.shares.holders({ id: world }),
    "shares.values": () => client.shares.values({ id: vineyard }),
    "shares.valueEvents": () => client.shares.valueEvents({ id: vineyard }),
    "race.leaderboard": () =>
      client.race.leaderboard({ board: "gain", period: "YTD" }),
    "race.shareLeaderboard": () =>
      client.race.shareLeaderboard({ period: "3M" }),
    "race.members": () => client.race.members({ period: "1M" }),
    "race.race": () => client.race.race({ period: "1W" }),
    "admin.people": () => client.admin.people(),
    "admin.shares": () => client.admin.shares(),
  };
}

const readRoutes = contractProcedures(apiContract).filter(
  ([, procedure]) => procedure["~orpc"].route.method === "GET",
);

function outputSchema(route: string): z.ZodType {
  const found = readRoutes.find(([path]) => path.join(".") === route);
  return found?.[1]["~orpc"].outputSchema as z.ZodType;
}

describe("the mock API", () => {
  it("answers every read of the contracts, each matching its contract", async () => {
    const { client } = mockClient({ session: "admin" });
    const calls = reads(client);
    expect(Object.keys(calls).toSorted()).toEqual(
      readRoutes.map(([path]) => path.join(".")).toSorted(),
    );

    for (const [route, call] of Object.entries(calls)) {
      const output = await call();
      expect(() => outputSchema(route).parse(output), route).not.toThrow();
    }
    for (const period of periods) {
      for (const call of [
        () => client.race.race({ period }),
        () => client.race.members({ period }),
        () => client.race.leaderboard({ board: "balance", period }),
        () => client.portfolio.get({ userId: sam, period }),
      ]) {
        await expect(call()).resolves.toBeDefined();
      }
    }
  });

  it("draws today's refreshes as provisional points after the last close", async () => {
    const { client } = mockClient({ session: "member" });
    const race = await client.race.race({ period: "1M" });
    const points = race.members[0]?.points ?? [];
    expect(points.length).toBeGreaterThan(20);
    expect(points.filter((point) => point.provisional).length).toBeGreaterThan(
      5,
    );
    expect(race.refreshesRunning).toBe(true);
    expect(race.notStarted.map((person) => person.displayName)).toContain(
      "Noa Lambert",
    );
  });

  it("gives an anonymous viewer no names, euro amounts or quantities", async () => {
    const { client } = mockClient({ session: "anonymous" });
    const calls = reads(client);
    for (const route of ["me.getAvatar", "access.setupStatus"]) {
      delete calls[route];
    }
    const answers = JSON.stringify(
      await Promise.all(Object.values(calls).map((call) => call())),
    );

    for (const person of fixturePeople) {
      if (person.role !== "anonymous") {
        expect(answers).not.toContain(person.displayName);
        expect(answers).not.toContain(`"${person.email}"`);
      }
    }
    // Share prices and their changes are market data, and stay.
    expect(answers).not.toMatch(
      /"(balanceEur|valueEur|sharesEur)":|"gain":\{"eur"/,
    );
    const portfolio = await client.portfolio.get({ userId: sam, period: "1M" });
    expect(portfolio.cashEur).toBe(portfolio.cashWeight);
    expect(portfolio.holdings[0]?.quantity).toBe(portfolio.holdings[0]?.weight);
  });

  it("shows a write in every later read", async () => {
    const { client } = mockClient({ session: "member" });
    const before = await client.portfolio.get({ userId: sam, period: "1M" });
    const held = before.holdings.find(
      (holding) => holding.share.id === world,
    )?.quantity;

    const change = await client.portfolio.addChange({
      userId: sam,
      shareId: world,
      quantityDelta: "5",
      effectiveAt: new Date(now.getTime() - 3_600_000).toISOString(),
    });

    const after = await client.portfolio.get({ userId: sam, period: "1M" });
    expect(
      after.holdings.find((holding) => holding.share.id === world)?.quantity,
    ).toBe(String(Number(held) + 5));
    expect((await client.portfolio.log({ userId: sam })).entries[0]?.id).toBe(
      change.id,
    );

    await client.me.update({ displayName: "Sam D." });
    expect((await client.me.get()).displayName).toBe("Sam D.");
    const members = await client.race.members({ period: "1M" });
    expect(members.members.map(({ member }) => member.displayName)).toContain(
      "Sam D.",
    );
  });

  it("lets the admin add a person, whose link then waits for first use", async () => {
    const { client } = mockClient({ session: "admin" });
    const { person, accessLink } = await client.admin.addPerson({
      role: "member",
      displayName: "Robin Test",
      email: "robin.test@example.com",
    });
    expect((await client.admin.people()).map(({ id }) => id)).toContain(
      person.id,
    );

    const key = accessLink.split("/access/")[1] ?? "";
    await expect(client.access.check({ key })).resolves.toMatchObject({
      state: "waiting",
      displayName: "Robin Test",
      hasPassword: false,
    });
  });

  it("reaches the error paths through the documented inputs", async () => {
    const { client, handlers } = mockClient();
    await expect(client.me.get()).rejects.toMatchObject({
      code: "unauthenticated",
    });
    await expect(
      client.access.check({ key: accessKeys.expired.key }),
    ).resolves.toMatchObject({ state: "expired" });
    await expect(
      client.access.claim({
        key: accessKeys.revoked.key,
        password: "a long password",
      }),
    ).rejects.toMatchObject({
      code: "invalid_access_key",
      data: { state: "revoked" },
    });
    await expect(
      client.access.check({ key: accessKeys.rateLimited.key }),
    ).rejects.toMatchObject({ code: "rate_limited" });

    const signIn = (password: string) =>
      getResponse(
        handlers,
        new Request(`${origin}/api/auth/sign-in/email`, {
          method: "POST",
          body: JSON.stringify({ email: "sam@example.com", password }),
        }),
      );
    expect((await signIn("wrong password"))?.status).toBe(401);
    expect((await signIn(mockPassword))?.status).toBe(200);
    await expect(
      client.portfolio.addChange({
        userId: sam,
        shareId: world,
        quantityDelta: "-1000",
        effectiveAt: now.toISOString(),
      }),
    ).rejects.toMatchObject({ code: "holding_below_zero" });
  });

  it("refuses what a role can't do", async () => {
    const guest = mockClient({ session: "guest" }).client;
    await expect(
      guest.portfolio.get({ userId: fixturePersonId("morgan"), period: "1M" }),
    ).rejects.toMatchObject({
      code: "not_found",
    });
    await expect(guest.admin.people()).rejects.toMatchObject({
      code: "forbidden",
    });

    const anonymous = mockClient({ session: "anonymous" }).client;
    await expect(anonymous.admin.people()).resolves.toBeDefined();
    await expect(anonymous.admin.revoke({ id: sam })).rejects.toMatchObject({
      code: "forbidden",
    });

    const revoked = mockClient({ session: fixturePersonId("eden") }).client;
    await expect(revoked.me.get()).rejects.toMatchObject({
      code: "access_ended",
    });
  });
});
