import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../../anonymize.js";
import { createOpenApiDocument } from "../../openapi.js";
import {
  addPortfolioChange,
  deletePortfolioChange,
  type PortfolioChange,
  type PortfolioHoldingBelowZeroDetails,
  portfolioChangeSchema,
  portfolioHoldingBelowZeroDetailsSchema,
  portfolioQuantityDeltaSchema,
  updatePortfolioChange,
} from "./changes.js";

const userId = "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70";
const id = "3e4f5a6b-7c8d-4e9f-8a1b-2c3d4e5f6a7b";
const shareId = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";

const sale: PortfolioChange = {
  type: "change",
  id,
  share: {
    id: shareId,
    isin: "FR0000000001",
    name: "Example Fund",
    kind: "market",
    symbol: "EXF.PA",
  },
  quantityDelta: "-25",
  effectiveAt: "2026-03-05T12:00:00+01:00",
};

const writeCodes = [
  "access_ended",
  "forbidden",
  "internal_error",
  "invalid_request",
  "not_found",
  "unauthenticated",
];

describe.each([
  {
    procedure: addPortfolioChange,
    method: "POST",
    path: "/users/{userId}/changes",
    successStatus: 201,
    codes: [...writeCodes, "future_moment", "holding_below_zero"],
  },
  {
    procedure: updatePortfolioChange,
    method: "PATCH",
    path: "/changes/{id}",
    successStatus: undefined,
    codes: [...writeCodes, "future_moment", "holding_below_zero"],
  },
  {
    procedure: deletePortfolioChange,
    method: "DELETE",
    path: "/changes/{id}",
    successStatus: 204,
    codes: [...writeCodes, "holding_below_zero"],
  },
])("$method $path", ({ procedure, method, path, successStatus, codes }) => {
  it("is declared for the admin and members, with its codes", () => {
    const { route, meta, errorMap } = procedure["~orpc"];
    expect(route).toMatchObject({ method, path });
    expect(route.successStatus).toBe(successStatus);
    expect(meta.roles).toEqual(["admin", "member"]);
    expect(Object.keys(errorMap).sort()).toEqual(codes.sort());
  });

  it("names the entry it would break in holding_below_zero", () => {
    const { errorMap } = procedure["~orpc"];
    expect(errorMap.holding_below_zero).toEqual({
      status: 422,
      data: portfolioHoldingBelowZeroDetailsSchema,
    });
  });
});

describe("POST /users/{userId}/changes", () => {
  const input = addPortfolioChange["~orpc"].inputSchema;
  const body = {
    userId,
    shareId,
    quantityDelta: "74.328",
    effectiveAt: "2026-03-02T09:00:00+01:00",
  };

  it("accepts a purchase and a sale, with decimals kept", () => {
    expect(input?.parse(body)).toEqual(body);
    expect(input?.safeParse({ ...body, quantityDelta: "-2" }).success).toBe(
      true,
    );
  });

  it.each([
    ["a zero quantity", { quantityDelta: "0" }],
    ["a zero quantity with decimals", { quantityDelta: "0.000" }],
    ["a number", { quantityDelta: 3 }],
    ["a plus sign", { quantityDelta: "+3" }],
    ["a comma", { quantityDelta: "3,5" }],
    ["a day without time", { effectiveAt: "2026-03-02" }],
    ["a moment without offset", { effectiveAt: "2026-03-02T09:00:00" }],
    ["a share id that isn't a uuid", { shareId: "example-fund" }],
  ])("refuses %s", (_, change) => {
    expect(input?.safeParse({ ...body, ...change }).success).toBe(false);
  });

  it("refuses a change without its share or moment", () => {
    const { shareId: _, ...withoutShare } = body;
    const { effectiveAt: __, ...withoutMoment } = body;
    expect(input?.safeParse(withoutShare).success).toBe(false);
    expect(input?.safeParse(withoutMoment).success).toBe(false);
  });

  it("takes an optional client-generated id, a UUID, against double saves", () => {
    expect(input?.parse({ ...body, id })).toEqual({ ...body, id });
    expect(input?.safeParse({ ...body, id: "save-1" }).success).toBe(false);
    expect(addPortfolioChange["~orpc"].route.successStatus).toBe(201);
  });
});

describe("PATCH /changes/{id}", () => {
  const input = updatePortfolioChange["~orpc"].inputSchema;

  it("accepts a new quantity, a new moment, or both", () => {
    expect(input?.safeParse({ id, quantityDelta: "-20" }).success).toBe(true);
    expect(
      input?.safeParse({ id, effectiveAt: "2026-03-04T12:00:00+01:00" })
        .success,
    ).toBe(true);
  });

  it("refuses an empty edit and a zero quantity", () => {
    expect(input?.safeParse({ id }).success).toBe(false);
    expect(input?.safeParse({ id, quantityDelta: "0" }).success).toBe(false);
  });
});

describe("DELETE /changes/{id}", () => {
  it("takes the change's id and answers no content", () => {
    const { inputSchema, outputSchema } = deletePortfolioChange["~orpc"];
    expect(inputSchema?.safeParse({ id }).success).toBe(true);
    expect(inputSchema?.safeParse({ id: "1" }).success).toBe(false);
    expect(outputSchema?.safeParse(undefined).success).toBe(true);
  });
});

describe("portfolioChangeSchema", () => {
  it("accepts a sale and refuses a zero or numeric quantity", () => {
    expect(portfolioChangeSchema.parse(sale)).toEqual(sale);
    expect(
      portfolioChangeSchema.safeParse({ ...sale, quantityDelta: "0" }).success,
    ).toBe(false);
    expect(
      portfolioChangeSchema.safeParse({ ...sale, quantityDelta: -25 }).success,
    ).toBe(false);
  });

  it("marks the quantity, and keeps the share", () => {
    expect(anonymizeKind(portfolioChangeSchema.shape.quantityDelta)).toBe(
      "quantity",
    );
    expect(anonymizeKind(portfolioChangeSchema.shape.share)).toBeUndefined();
    expect(anonymizeKind(portfolioQuantityDeltaSchema)).toBeUndefined();
  });
});

describe("portfolioHoldingBelowZeroDetailsSchema", () => {
  it("names a stored change, or the change sent", () => {
    const stored: PortfolioHoldingBelowZeroDetails = {
      change: sale,
      held: "10",
    };
    expect(portfolioHoldingBelowZeroDetailsSchema.parse(stored)).toEqual(
      stored,
    );
    expect(
      portfolioHoldingBelowZeroDetailsSchema.safeParse({
        change: null,
        held: "0",
      }).success,
    ).toBe(true);
    expect(portfolioHoldingBelowZeroDetailsSchema.safeParse({}).success).toBe(
      false,
    );
  });

  it("marks the quantity held", () => {
    expect(
      anonymizeKind(portfolioHoldingBelowZeroDetailsSchema.shape.held),
    ).toBe("quantity");
  });
});

describe("OpenAPI document", () => {
  it("lists the change routes with their roles, statuses and markers", async () => {
    const paths = (await createOpenApiDocument()).paths;
    const add = paths?.["/users/{userId}/changes"]?.post;
    const edit = paths?.["/changes/{id}"]?.patch;
    const remove = paths?.["/changes/{id}"]?.delete;

    expect(add).toMatchObject({
      operationId: "portfolio.addChange",
      "x-roles": ["admin", "member"],
      responses: {
        "201": {
          content: {
            "application/json": {
              schema: {
                properties: { quantityDelta: { "x-anonymize": "quantity" } },
              },
            },
          },
        },
        "422": { description: "`holding_below_zero`, `future_moment`" },
      },
    });
    expect(edit).toMatchObject({ operationId: "portfolio.updateChange" });
    expect(Object.keys(remove?.responses ?? {})).toContain("204");
  });
});
