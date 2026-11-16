import type { ErrorBody } from "@fpr/contracts";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { MutationObserver, type QueryKey } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "../src/lib/api/client.ts";
import { errorTextKey } from "../src/lib/api/errors.ts";
import { createQueryClient } from "../src/lib/api/query-client.ts";
import { createI18n } from "../src/lib/i18n.ts";

const userId = "0b8a4c62-5d1e-4f0a-9c3e-2a7f6b1d9e40";
const shareId = "5e2d7a10-3c4b-4e8f-a1d6-9b0c8f7e6a52";

/** A client whose every call is answered by `answer`, with the requests it sent. */
function stubbedClient(
  answer: (request: Request) => Response | Promise<Response>,
) {
  const requests: Request[] = [];
  const onAccessEnded = vi.fn();
  const client = createApiClient({
    url: "https://fpr.example.com/api",
    fetch: async (request) => {
      requests.push(request);
      return answer(request);
    },
    onAccessEnded,
  });
  return { client, requests, onAccessEnded };
}

function errorAnswer(status: number, error: ErrorBody["error"]): Response {
  return Response.json({ error } satisfies ErrorBody, { status });
}

/** The text a failed call is shown with, in English and French. */
async function failureText(call: Promise<unknown>): Promise<[string, string]> {
  const error = await call.then(
    () => expect.fail("the call should fail"),
    (reason: unknown) => reason,
  );
  const key = errorTextKey(error);
  return [createI18n("en").t(key), createI18n("fr").t(key)];
}

describe("the API client", () => {
  it("sends each route's method and path, with the rest of the input as the body", async () => {
    const change = {
      type: "change",
      id: "c1f0e2d3-4b5a-4c6d-8e7f-a0b1c2d3e4f5",
      share: { id: shareId, name: "Northwind Industries" },
      quantityDelta: "3",
      effectiveAt: "2026-03-05T14:30:00.000Z",
    };
    const { client, requests } = stubbedClient(() =>
      Response.json(change, { status: 201 }),
    );

    await expect(
      client.portfolio.addChange({
        userId,
        id: change.id,
        shareId,
        quantityDelta: "3",
        effectiveAt: change.effectiveAt,
      }),
    ).resolves.toEqual(change);

    const [request] = requests;
    expect(request?.method).toBe("POST");
    expect(request?.url).toBe(
      `https://fpr.example.com/api/users/${userId}/changes`,
    );
    expect(await request?.json()).toEqual({
      id: change.id,
      shareId,
      quantityDelta: "3",
      effectiveAt: change.effectiveAt,
    });
  });

  it("throws an FPR error with its code, status and details, written in the person's language", async () => {
    const { client } = stubbedClient(() =>
      errorAnswer(409, {
        code: "value_changed",
        details: { priceEur: "12.40" },
      }),
    );
    const call = client.shares.deleteValue({
      id: shareId,
      at: "2026-03-05T00:00:00.000Z",
      expectedPriceEur: "12.30",
    });

    await expect(call).rejects.toMatchObject({
      code: "value_changed",
      status: 409,
      data: { priceEur: "12.40" },
      defined: true,
    });
    expect(await failureText(call)).toEqual([
      "Someone changed this value in the meantime. Check the new value, then confirm again.",
      "Quelqu’un a modifié cette valeur entre-temps. Vérifiez la nouvelle valeur, puis confirmez de nouveau.",
    ]);
  });

  it("writes an answer without an FPR code as an internal error, and no answer as unreachable", async () => {
    const proxyPage = stubbedClient(
      () => new Response("<h1>502 Bad Gateway</h1>", { status: 502 }),
    );
    expect(await failureText(proxyPage.client.me.get())).toEqual([
      "Something went wrong on FPR’s side. Try again in a moment.",
      "Un problème est survenu du côté de FPR. Réessayez dans un instant.",
    ]);

    const offline = stubbedClient(() => {
      throw new TypeError("Failed to fetch");
    });
    expect(await failureText(offline.client.me.get())).toEqual([
      "FPR can’t be reached. Check your connection and try again.",
      "FPR est injoignable. Vérifiez votre connexion et réessayez.",
    ]);
  });

  it("signs the person out when any call answers access_ended", async () => {
    const { client, onAccessEnded } = stubbedClient(({ url }) =>
      url.endsWith("/me")
        ? Response.json({})
        : errorAnswer(401, { code: "access_ended" }),
    );

    await client.me.get();
    expect(onAccessEnded).not.toHaveBeenCalled();

    await expect(client.race.members({ period: "1M" })).rejects.toMatchObject({
      code: "access_ended",
      status: 401,
    });
    expect(onAccessEnded).toHaveBeenCalledOnce();
  });
});

describe("the query client", () => {
  it("invalidates the portfolio, log, leaderboards, members and race after a portfolio write", async () => {
    const { client } = stubbedClient(() => Response.json({}, { status: 201 }));
    const api = createTanstackQueryUtils(client);
    const queryClient = createQueryClient();
    const reads: Record<string, QueryKey> = {
      portfolio: api.portfolio.get.queryKey({
        input: { userId, period: "1M" },
      }),
      log: api.portfolio.log.queryKey({ input: { userId } }),
      leaderboard: api.race.leaderboard.queryKey({
        input: { board: "gain", period: "1M" },
      }),
      members: api.race.members.queryKey({ input: { period: "1M" } }),
      race: api.race.race.queryKey({ input: { period: "1M" } }),
      me: api.me.get.queryKey(),
      people: api.admin.people.queryKey(),
    };
    for (const key of Object.values(reads)) {
      queryClient.setQueryData(key, {});
    }

    await new MutationObserver(
      queryClient,
      api.portfolio.setCash.mutationOptions(),
    ).mutate({
      userId,
      id: "d2e3f4a5-b6c7-4d8e-9f0a-1b2c3d4e5f60",
      amountEur: "1250.00",
      effectiveAt: "2026-03-05T14:30:00.000Z",
    });

    const invalidated = Object.fromEntries(
      Object.entries(reads).map(([read, key]) => [
        read,
        queryClient.getQueryState(key)?.isInvalidated,
      ]),
    );
    expect(invalidated).toEqual({
      portfolio: true,
      log: true,
      leaderboard: true,
      members: true,
      race: true,
      me: false,
      people: false,
    });
  });
});
