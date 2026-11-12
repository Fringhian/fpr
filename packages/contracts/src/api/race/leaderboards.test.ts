import { StandardOpenAPIMatcher } from "@orpc/openapi/standard";
import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../../anonymize.js";
import { createOpenApiDocument } from "../../openapi.js";
import { gainSchema, priceChangeSchema } from "../../schemas/performance.js";
import { raceContract } from "./index.js";
import {
  getLeaderboard,
  getShareLeaderboard,
  type Leaderboard,
  leaderboardQuerySchema,
  leaderboardSchema,
  type ShareLeaderboard,
  shareLeaderboardSchema,
} from "./leaderboards.js";

const alex = {
  id: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70",
  displayName: "Alex Martin",
  avatarUrl: null,
  color: 3,
};

const sam = {
  id: "1c7a4d2f-9b3e-4d8f-a021-3c4d5e6f7a81",
  displayName: "Sam Rivera",
  avatarUrl: "https://storage.example.com/avatars/sam.webp",
  color: 5,
};

const exampleFund = {
  id: "2d8b5e3a-ac4f-4e90-b132-4d5e6f7a8b92",
  isin: "IE00B4L5Y983",
  name: "Example World Fund",
  kind: "market",
  symbol: "EXW.XETRA",
} as const;

const bestHolding = {
  share: exampleFund,
  gain: { eur: "310.00", percent: "12.4" },
};

const balanceBoard: Leaderboard = {
  board: "balance",
  lastCloseOn: "2026-03-02",
  rows: [
    {
      member: sam,
      balanceEur: "21600.00",
      incomplete: false,
      bestHolding,
    },
    {
      member: alex,
      balanceEur: "12374.50",
      incomplete: true,
      bestHolding: null,
    },
  ],
  notStarted: [],
};

const gainBoard: Leaderboard = {
  board: "gain",
  unit: "eur",
  lastCloseOn: "2026-03-02",
  rows: [
    {
      member: sam,
      gain: { eur: "1240.00", percent: "6.1" },
      measuredFrom: null,
      incomplete: false,
      bestHolding,
    },
    {
      member: alex,
      gain: { eur: "-140.25", percent: "-1.12" },
      measuredFrom: "2026-02-12",
      incomplete: false,
      bestHolding: null,
    },
  ],
  notStarted: [{ ...alex, id: "3e9c6f4b-bd50-4fa1-8243-5e6f7a8b9ca3" }],
};

const [balanceOption, gainOption] = leaderboardSchema.options;

describe("GET /leaderboards/{board}", () => {
  it("is declared for every role, with the session and input codes", () => {
    const { route, meta, errorMap } = getLeaderboard["~orpc"];
    expect(route).toMatchObject({
      method: "GET",
      path: "/leaderboards/{board}",
    });
    expect(meta.roles).toEqual(["admin", "member", "guest", "anonymous"]);
    expect(Object.keys(errorMap).sort()).toEqual(
      [
        "access_ended",
        "internal_error",
        "invalid_request",
        "unauthenticated",
      ].sort(),
    );
  });

  it("takes the board in the path, and the period and unit as query strings", () => {
    const query = { board: "gain", period: "1M", unit: "percent" };
    expect(leaderboardQuerySchema.safeParse(query).success).toBe(true);
    expect(
      leaderboardQuerySchema.safeParse({ ...query, board: "shares" }).success,
    ).toBe(false);
    expect(
      leaderboardQuerySchema.safeParse({ ...query, period: "2Y" }).success,
    ).toBe(false);
    expect(
      leaderboardQuerySchema.safeParse({ ...query, unit: "usd" }).success,
    ).toBe(false);
    expect(leaderboardQuerySchema.safeParse({ board: "balance" }).success).toBe(
      false,
    );
  });

  it("ranks the gain board in euros when the unit is left out", () => {
    expect(
      leaderboardQuerySchema.parse({ board: "balance", period: "1M" }),
    ).toEqual({ board: "balance", period: "1M", unit: "eur" });
    expect(getLeaderboard["~orpc"].inputSchema).toBe(leaderboardQuerySchema);
  });

  it("answers the balance board, and the gain board ranked in euros or percent", () => {
    expect(leaderboardSchema.parse(balanceBoard)).toEqual(balanceBoard);
    expect(leaderboardSchema.parse(gainBoard)).toEqual(gainBoard);
    const inPercent = { ...gainBoard, unit: "percent" };
    expect(leaderboardSchema.parse(inPercent)).toEqual(inPercent);
  });

  it("refuses a gain board without its unit, a gain without its percent, and amounts that aren't decimal strings", () => {
    const { unit: _, ...withoutUnit } = gainBoard;
    expect(leaderboardSchema.safeParse(withoutUnit).success).toBe(false);
    const [gainRow] = gainBoard.rows;
    expect(
      leaderboardSchema.safeParse({
        ...gainBoard,
        rows: [{ ...gainRow, gain: { eur: "1240.00" } }],
      }).success,
    ).toBe(false);
    const [row] = balanceBoard.rows;
    const asNumber = { ...balanceBoard, rows: [{ ...row, balanceEur: 21600 }] };
    expect(leaderboardSchema.safeParse(asNumber).success).toBe(false);
    const asFloat = {
      ...balanceBoard,
      rows: [{ ...row, balanceEur: "2.16e4" }],
    };
    expect(leaderboardSchema.safeParse(asFloat).success).toBe(false);
  });

  it("names no unit on the balance board", () => {
    expect(balanceOption.shape).not.toHaveProperty("unit");
  });

  it("carries the measured-from, incomplete and not-started markers", () => {
    const row = gainOption.shape.rows.element.shape;
    expect(row.measuredFrom.safeParse("2026-02-12").success).toBe(true);
    expect(row.measuredFrom.safeParse(null).success).toBe(true);
    expect(row.incomplete.safeParse(true).success).toBe(true);
    expect(gainOption.shape.notStarted.safeParse([alex]).success).toBe(true);
    expect(balanceOption.shape.notStarted.safeParse([alex]).success).toBe(true);
  });

  it("marks names and pictures personal, the balance and euro gains euro, and keeps percentages", () => {
    const balanceRow = balanceOption.shape.rows.element.shape;
    expect(anonymizeKind(balanceRow.member.shape.displayName)).toBe("personal");
    expect(anonymizeKind(balanceRow.member.shape.avatarUrl)).toBe("personal");
    expect(anonymizeKind(balanceRow.balanceEur)).toBe("euro");
    const gainRow = gainOption.shape.rows.element.shape;
    expect(gainRow.gain).toBe(gainSchema);
    expect(anonymizeKind(gainRow.gain.shape.eur)).toBe("euro");
    expect(anonymizeKind(gainRow.gain.shape.percent)).toBeUndefined();
    expect(balanceRow.bestHolding.unwrap().shape.gain).toBe(gainSchema);
  });

  it("is in the OpenAPI document, with its roles, markers and error codes", async () => {
    const operation = (await createOpenApiDocument()).paths?.[
      "/leaderboards/{board}"
    ]?.get;

    expect(operation).toMatchObject({
      operationId: "race.leaderboard",
      "x-roles": ["admin", "member", "guest", "anonymous"],
    });
    expect(Object.keys(operation?.responses ?? {}).sort()).toEqual([
      "200",
      "400",
      "401",
      "500",
    ]);
    const json = JSON.stringify(operation?.responses?.["200"]);
    expect(json).toContain('"x-anonymize":"euro"');
    expect(json).not.toContain('"x-anonymize":"quantity"');
  });
});

const shareBoard: ShareLeaderboard = {
  lastCloseOn: "2026-03-02",
  rows: [
    { share: exampleFund, change: { eur: "4.95", percent: "12.4" } },
    {
      share: {
        id: "4fad7a5c-ce61-40b2-9354-6f7a8b9cadb4",
        isin: "FR0000000001",
        name: "Example Manual Fund",
        kind: "manual",
        symbol: null,
      },
      change: { eur: "-1.22", percent: "-3.05" },
    },
  ],
};

describe("GET /leaderboards/shares", () => {
  it("is declared for every role, with the session and input codes", () => {
    const { route, meta, errorMap } = getShareLeaderboard["~orpc"];
    expect(route).toMatchObject({
      method: "GET",
      path: "/leaderboards/shares",
    });
    expect(meta.roles).toEqual(["admin", "member", "guest", "anonymous"]);
    expect(Object.keys(errorMap).sort()).toEqual(
      [
        "access_ended",
        "internal_error",
        "invalid_request",
        "unauthenticated",
      ].sort(),
    );
  });

  it("takes the period as a query string", () => {
    const input = getShareLeaderboard["~orpc"].inputSchema;
    expect(input?.safeParse({ period: "YTD" }).success).toBe(true);
    expect(input?.safeParse({ period: "ytd" }).success).toBe(false);
    expect(input?.safeParse({}).success).toBe(false);
  });

  it("accepts the ranked shares with their change, and refuses a change that isn't decimal strings", () => {
    expect(shareLeaderboardSchema.parse(shareBoard)).toEqual(shareBoard);
    expect(shareLeaderboardSchema.shape.rows.element.shape.change).toBe(
      priceChangeSchema,
    );
    const asNumber = {
      ...shareBoard,
      rows: [{ share: exampleFund, change: { eur: 4.95, percent: 12.4 } }],
    };
    expect(shareLeaderboardSchema.safeParse(asNumber).success).toBe(false);
  });

  it("marks nothing: share changes are market data", async () => {
    const operation = (await createOpenApiDocument()).paths?.[
      "/leaderboards/shares"
    ]?.get;
    expect(operation).toMatchObject({
      operationId: "race.shareLeaderboard",
      "x-roles": ["admin", "member", "guest", "anonymous"],
    });
    expect(JSON.stringify(operation)).not.toContain("x-anonymize");
  });
});

/**
 * oRPC's matcher over the race's routes, in this order. It takes any object
 * with a procedure's fields, so each contract stands in for its
 * implementation.
 */
function matcherFor(
  entries: [string, (typeof raceContract)[keyof typeof raceContract]][],
) {
  const implemented = Object.fromEntries(
    entries.map(([key, contract]) => [
      key,
      {
        "~orpc": {
          ...contract["~orpc"],
          middlewares: [],
          inputValidationIndex: 0,
          outputValidationIndex: 0,
          handler: () => undefined,
        },
      },
    ]),
  );
  const matcher = new StandardOpenAPIMatcher();
  matcher.init({ race: implemented } as Parameters<
    StandardOpenAPIMatcher["init"]
  >[0]);
  return matcher;
}

const routeOrders = [
  ["declared in the contract's order", Object.entries(raceContract)],
  ["declared in reverse", Object.entries(raceContract).reverse()],
] as const;

describe.each(routeOrders)(
  "/leaderboards/shares and /leaderboards/{board}, %s",
  (_, entries) => {
    const matcher = matcherFor([...entries]);

    it("sends /leaderboards/shares to the share leaderboard", async () => {
      const match = await matcher.match("GET", "/leaderboards/shares");
      expect(match?.path).toEqual(["race", "shareLeaderboard"]);
    });

    it.each(["balance", "gain"])(
      "sends /leaderboards/%s to the member leaderboard",
      async (board) => {
        const match = await matcher.match("GET", `/leaderboards/${board}`);
        expect(match?.path).toEqual(["race", "leaderboard"]);
        expect(match?.params).toEqual({ board });
      },
    );
  },
);
