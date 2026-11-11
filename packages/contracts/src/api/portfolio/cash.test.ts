import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../../anonymize.js";
import { createOpenApiDocument } from "../../openapi.js";
import {
  deletePortfolioCash,
  type PortfolioCashBalance,
  portfolioCashBalanceSchema,
  setPortfolioCash,
  updatePortfolioCash,
} from "./cash.js";

const userId = "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70";
const id = "4f5a6b7c-8d9e-4f0a-9b1c-2d3e4f5a6b7c";

const balance: PortfolioCashBalance = {
  type: "cash",
  id,
  amountEur: "1250.00",
  effectiveAt: "2026-03-02T12:00:00+01:00",
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
    procedure: setPortfolioCash,
    method: "POST",
    path: "/users/{userId}/cash-balances",
    successStatus: 201,
    codes: [...writeCodes, "future_moment"],
  },
  {
    procedure: updatePortfolioCash,
    method: "PATCH",
    path: "/cash-balances/{id}",
    successStatus: undefined,
    codes: [...writeCodes, "future_moment"],
  },
  {
    procedure: deletePortfolioCash,
    method: "DELETE",
    path: "/cash-balances/{id}",
    successStatus: 204,
    codes: writeCodes,
  },
])("$method $path", ({ procedure, method, path, successStatus, codes }) => {
  it("is declared for the admin and members, with its codes", () => {
    const { route, meta, errorMap } = procedure["~orpc"];
    expect(route).toMatchObject({ method, path });
    expect(route.successStatus).toBe(successStatus);
    expect(meta.roles).toEqual(["admin", "member"]);
    expect(Object.keys(errorMap).sort()).toEqual([...codes].sort());
  });
});

describe("POST /users/{userId}/cash-balances", () => {
  const input = setPortfolioCash["~orpc"].inputSchema;
  const body = {
    userId,
    amountEur: "30",
    effectiveAt: "2026-03-02T12:00:00+01:00",
  };

  it("accepts an amount of zero or more", () => {
    expect(input?.parse(body)).toEqual(body);
    expect(input?.safeParse({ ...body, amountEur: "0" }).success).toBe(true);
  });

  it.each([
    ["a negative amount", { amountEur: "-5" }],
    ["a number", { amountEur: 30 }],
    ["an exponent", { amountEur: "3e1" }],
    ["a moment without offset", { effectiveAt: "2026-03-02T12:00:00" }],
    ["a missing amount", { amountEur: undefined }],
  ])("refuses %s", (_, cash) => {
    expect(input?.safeParse({ ...body, ...cash }).success).toBe(false);
  });
});

describe("PATCH /cash-balances/{id}", () => {
  const input = updatePortfolioCash["~orpc"].inputSchema;

  it("accepts a new amount, a new moment, or both", () => {
    expect(input?.safeParse({ id, amountEur: "40.10" }).success).toBe(true);
    expect(
      input?.safeParse({ id, effectiveAt: "2026-03-01T12:00:00Z" }).success,
    ).toBe(true);
  });

  it("refuses an empty edit and a negative amount", () => {
    expect(input?.safeParse({ id }).success).toBe(false);
    expect(input?.safeParse({ id, amountEur: "-1" }).success).toBe(false);
  });
});

describe("DELETE /cash-balances/{id}", () => {
  it("takes the balance's id and answers no content", () => {
    const { inputSchema, outputSchema } = deletePortfolioCash["~orpc"];
    expect(inputSchema?.safeParse({ id }).success).toBe(true);
    expect(inputSchema?.safeParse({ id: "cash" }).success).toBe(false);
    expect(outputSchema?.safeParse(undefined).success).toBe(true);
  });
});

describe("portfolioCashBalanceSchema", () => {
  it("accepts a balance and refuses a negative one", () => {
    expect(portfolioCashBalanceSchema.parse(balance)).toEqual(balance);
    expect(
      portfolioCashBalanceSchema.safeParse({ ...balance, amountEur: "-1" })
        .success,
    ).toBe(false);
  });

  it("marks cash as a quantity", () => {
    expect(anonymizeKind(portfolioCashBalanceSchema.shape.amountEur)).toBe(
      "quantity",
    );
  });

  it("is in the OpenAPI document with its marker", async () => {
    const operation = (await createOpenApiDocument()).paths?.[
      "/users/{userId}/cash-balances"
    ]?.post;
    expect(operation).toMatchObject({
      operationId: "portfolio.setCash",
      "x-roles": ["admin", "member"],
      responses: {
        "201": {
          content: {
            "application/json": {
              schema: {
                properties: { amountEur: { "x-anonymize": "quantity" } },
              },
            },
          },
        },
        "422": { description: "`future_moment`" },
      },
    });
  });
});
