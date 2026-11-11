import { describe, expect, it } from "vitest";
import { createOpenApiDocument } from "../../openapi.js";
import {
  createManualShare,
  type ShareManualBody,
  shareManualBodySchema,
  updateShare,
} from "./manual.js";
import { shareIsinTakenDetailsSchema } from "./schemas.js";

const document = await createOpenApiDocument();

const shareId = "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f71";

const body: ShareManualBody = {
  isin: "XS000EXMPL31",
  name: "Example Certificate",
  priceEur: "40.10",
  at: "2026-03-02T05:10:00+01:00",
};

describe("POST /shares/manual", () => {
  it("is declared for members and the admin, answering 201", () => {
    const { route, meta, errorMap } = createManualShare["~orpc"];
    expect(route).toMatchObject({
      method: "POST",
      path: "/shares/manual",
      successStatus: 201,
    });
    expect(meta.roles).toEqual(["admin", "member"]);
    expect(Object.keys(errorMap).sort()).toEqual(
      [
        "access_ended",
        "forbidden",
        "future_moment",
        "internal_error",
        "invalid_request",
        "isin_taken",
        "unauthenticated",
      ].sort(),
    );
  });

  it("accepts an ISIN, a name, and a first value, trimming the name", () => {
    expect(
      shareManualBodySchema.parse({ ...body, name: " Example Certificate " }),
    ).toEqual(body);
  });

  it.each([
    ["an invalid ISIN", { isin: "XS000EXMPL3" }],
    ["an empty name", { name: "  " }],
    ["a value of zero", { priceEur: "0.00" }],
    ["a value below zero", { priceEur: "-40.10" }],
    ["a value as a number", { priceEur: 40.1 }],
    ["a day without its time", { at: "2026-03-02" }],
  ])("refuses %s", (_, change) => {
    expect(
      shareManualBodySchema.safeParse({ ...body, ...change }).success,
    ).toBe(false);
  });

  it("is in the OpenAPI document with 201, 409 and 422", () => {
    const operation = document.paths?.["/shares/manual"]?.post;
    expect(operation).toMatchObject({ "x-roles": ["admin", "member"] });
    expect(operation?.responses).toMatchObject({
      "201": {},
      "409": { description: "`isin_taken`" },
      "422": { description: "`future_moment`" },
    });
  });
});

describe("PATCH /shares/{id}", () => {
  const input = updateShare["~orpc"].inputSchema;

  it("is declared for members and the admin, with isin_taken", () => {
    const { route, meta, errorMap } = updateShare["~orpc"];
    expect(route).toMatchObject({ method: "PATCH", path: "/shares/{id}" });
    expect(meta.roles).toEqual(["admin", "member"]);
    expect(Object.keys(errorMap).sort()).toEqual(
      [
        "access_ended",
        "forbidden",
        "internal_error",
        "invalid_request",
        "isin_taken",
        "not_found",
        "unauthenticated",
      ].sort(),
    );
  });

  it("accepts a new name, a new ISIN, or both", () => {
    expect(
      input?.safeParse({ id: shareId, name: "Example Note" }).success,
    ).toBe(true);
    expect(
      input?.safeParse({ id: shareId, isin: "FR000EXMPL06" }).success,
    ).toBe(true);
    expect(
      input?.safeParse({ id: shareId, name: "Example Note", isin: body.isin })
        .success,
    ).toBe(true);
  });

  it("refuses an edit with neither, or an invalid ISIN", () => {
    expect(input?.safeParse({ id: shareId }).success).toBe(false);
    expect(input?.safeParse({ id: shareId, isin: "FR0" }).success).toBe(false);
    expect(input?.safeParse({ id: shareId, name: "" }).success).toBe(false);
  });

  it("names the share that has the ISIN in isin_taken's details", () => {
    expect(shareIsinTakenDetailsSchema.parse({ shareId })).toEqual({ shareId });
    expect(shareIsinTakenDetailsSchema.safeParse({}).success).toBe(false);
  });

  it("is in the OpenAPI document with the id in the path and the edit in the body", () => {
    const operation = document.paths?.["/shares/{id}"]?.patch;
    expect(operation).toMatchObject({ "x-roles": ["admin", "member"] });
    expect(operation?.parameters).toMatchObject([{ in: "path", name: "id" }]);
    expect(operation?.requestBody).toMatchObject({
      content: {
        "application/json": {
          schema: { properties: { name: {}, isin: {} } },
        },
      },
    });
  });
});
