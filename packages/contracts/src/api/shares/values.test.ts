import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../../anonymize.js";
import { createOpenApiDocument } from "../../openapi.js";
import {
  addShareValue,
  deleteShareValue,
  getShareValueEvents,
  getShareValues,
  type ShareValue,
  type ShareValueEvent,
  shareValueBodySchema,
  shareValueChangedDetailsSchema,
  shareValueDeleteBodySchema,
  shareValueEventSchema,
  shareValueEventsSchema,
  shareValueParamsSchema,
  shareValueSchema,
  shareValuesSchema,
  shareValueUpdateBodySchema,
  updateShareValue,
} from "./values.js";

const document = await createOpenApiDocument();

const shareId = "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f71";

const everyRole = ["admin", "member", "guest", "anonymous"];

const alex = {
  id: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70",
  displayName: "Alex Martin",
  avatarUrl: null,
  color: 3,
};

const value: ShareValue = {
  at: "2026-03-02T05:10:00+01:00",
  priceEur: "40.10",
  enteredBy: alex,
};

const events: ShareValueEvent[] = [
  {
    id: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f74",
    action: "deleted",
    at: "2026-03-09T05:10:00+01:00",
    priceEur: null,
    previousPriceEur: "40.50",
    madeBy: null,
    madeAt: "2026-03-10T08:00:00Z",
  },
  {
    id: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f75",
    action: "edited",
    at: "2026-03-02T05:10:00+01:00",
    priceEur: "40.10",
    previousPriceEur: "41.00",
    madeBy: alex,
    madeAt: "2026-03-03T12:00:00Z",
  },
  {
    id: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f76",
    action: "added",
    at: "2026-03-02T05:10:00+01:00",
    priceEur: "41.00",
    previousPriceEur: null,
    madeBy: alex,
    madeAt: "2026-03-02T09:00:00Z",
  },
];

/** The codes of a write on a value point, beyond its own. */
const writeCodes = [
  "access_ended",
  "forbidden",
  "internal_error",
  "invalid_request",
  "not_found",
  "unauthenticated",
];

describe("GET /shares/{id}/values", () => {
  it("is declared for every signed-in role, with not_found", () => {
    const { route, meta, errorMap } = getShareValues["~orpc"];
    expect(route).toMatchObject({ method: "GET", path: "/shares/{id}/values" });
    expect(meta.roles).toEqual(everyRole);
    expect(Object.keys(errorMap).sort()).toEqual(
      [
        "access_ended",
        "internal_error",
        "invalid_request",
        "not_found",
        "unauthenticated",
      ].sort(),
    );
  });

  it("accepts value points, one entered by a deleted person, and none", () => {
    const values = { values: [value, { ...value, enteredBy: null }] };
    expect(shareValuesSchema.parse(values)).toEqual(values);
    expect(shareValuesSchema.safeParse({ values: [] }).success).toBe(true);
    expect(
      shareValueSchema.safeParse({ ...value, priceEur: 40.1 }).success,
    ).toBe(false);
  });

  it("marks who entered the value, and keeps the value", () => {
    const enteredBy = shareValueSchema.shape.enteredBy.unwrap().shape;
    expect(anonymizeKind(enteredBy.displayName)).toBe("personal");
    expect(anonymizeKind(enteredBy.avatarUrl)).toBe("personal");
    expect(anonymizeKind(shareValueSchema.shape.priceEur)).toBeUndefined();
  });
});

describe("GET /shares/{id}/value-events", () => {
  it("is declared for every signed-in role, with not_found", () => {
    const { route, meta, errorMap } = getShareValueEvents["~orpc"];
    expect(route).toMatchObject({
      method: "GET",
      path: "/shares/{id}/value-events",
    });
    expect(meta.roles).toEqual(everyRole);
    expect(Object.keys(errorMap)).toContain("not_found");
  });

  it("accepts an addition, an edit, and a deletion", () => {
    expect(shareValueEventsSchema.parse({ events })).toEqual({ events });
  });

  it.each([
    [
      "an addition with a previous value",
      { ...events[2], previousPriceEur: "1" },
    ],
    [
      "an edit without its previous value",
      { ...events[1], previousPriceEur: null },
    ],
    ["a deletion with a new value", { ...events[0], priceEur: "40.50" }],
    ["an unknown action", { ...events[1], action: "replaced" }],
  ])("refuses %s", (_, event) => {
    expect(shareValueEventSchema.safeParse(event).success).toBe(false);
  });

  it("marks who made the edit in every action", () => {
    for (const option of shareValueEventSchema.options) {
      const madeBy = option.shape.madeBy.unwrap().shape;
      expect(anonymizeKind(madeBy.displayName)).toBe("personal");
      expect(anonymizeKind(madeBy.avatarUrl)).toBe("personal");
    }
  });
});

describe("POST /shares/{id}/values", () => {
  it("is declared for members and the admin, answering 201", () => {
    const { route, meta, errorMap } = addShareValue["~orpc"];
    expect(route).toMatchObject({
      method: "POST",
      path: "/shares/{id}/values",
      successStatus: 201,
    });
    expect(meta.roles).toEqual(["admin", "member"]);
    expect(Object.keys(errorMap).sort()).toEqual(
      [...writeCodes, "future_moment", "value_changed"].sort(),
    );
  });

  it("accepts a moment and a value above zero", () => {
    const body = { at: value.at, priceEur: value.priceEur };
    expect(shareValueBodySchema.parse(body)).toEqual(body);
    expect(
      addShareValue["~orpc"].inputSchema?.safeParse({ id: shareId, ...body })
        .success,
    ).toBe(true);
  });

  it.each([
    ["a value of zero", { priceEur: "0" }],
    ["a day without its time", { at: "2026-03-02" }],
    ["a moment without its offset", { at: "2026-03-02T05:10:00" }],
  ])("refuses %s", (_, change) => {
    expect(
      shareValueBodySchema.safeParse({
        at: value.at,
        priceEur: value.priceEur,
        ...change,
      }).success,
    ).toBe(false);
  });
});

describe("{at} in a value point's path", () => {
  it.each([
    "2026-03-02T05:10:00+01:00",
    "2026-03-02T04:10:00Z",
    "2026-03-02T04:10:00.123456Z",
  ])("round-trips %s as one percent-encoded path segment", (at) => {
    const segment = encodeURIComponent(at);
    expect(segment).not.toMatch(/[/+:]/);
    expect(
      shareValueParamsSchema.parse({
        id: shareId,
        at: decodeURIComponent(segment),
      }),
    ).toEqual({ id: shareId, at });
  });

  it("accepts a `+` sent unencoded, which a path keeps", () => {
    expect(
      shareValueParamsSchema.safeParse({
        id: shareId,
        at: decodeURIComponent("2026-03-02T05:10:00+01:00"),
      }).success,
    ).toBe(true);
  });

  it.each([
    "2026-03-02",
    "2026-03-02T05:10:00",
    "2026-03-02T05:10:00 01:00",
    "2026-13-02T05:10:00Z",
    "1772424600000",
    "",
  ])("refuses %j", (at) => {
    expect(shareValueParamsSchema.safeParse({ id: shareId, at }).success).toBe(
      false,
    );
  });

  it("is a path param of the edit and the deletion in the OpenAPI document", () => {
    const path = document.paths?.["/shares/{id}/values/{at}"];
    for (const operation of [path?.patch, path?.delete]) {
      expect(operation?.parameters).toMatchObject([
        { in: "path", name: "id", required: true },
        {
          in: "path",
          name: "at",
          required: true,
          schema: { type: "string", format: "date-time" },
        },
      ]);
    }
  });
});

describe("PATCH /shares/{id}/values/{at}", () => {
  it("is declared for members and the admin, with value_changed", () => {
    const { route, meta, errorMap } = updateShareValue["~orpc"];
    expect(route).toMatchObject({
      method: "PATCH",
      path: "/shares/{id}/values/{at}",
    });
    expect(meta.roles).toEqual(["admin", "member"]);
    expect(Object.keys(errorMap).sort()).toEqual(
      [...writeCodes, "value_changed"].sort(),
    );
  });

  it("takes the new value and the value the editor last saw", () => {
    const body = { priceEur: "40.10", expectedPriceEur: "41.00" };
    expect(shareValueUpdateBodySchema.parse(body)).toEqual(body);
    expect(
      updateShareValue["~orpc"].inputSchema?.safeParse({
        id: shareId,
        at: value.at,
        ...body,
      }).success,
    ).toBe(true);
    expect(
      shareValueUpdateBodySchema.safeParse({ priceEur: "40.10" }).success,
    ).toBe(false);
    expect(
      shareValueUpdateBodySchema.safeParse({
        priceEur: "-1",
        expectedPriceEur: "41.00",
      }).success,
    ).toBe(false);
  });

  it("carries the stored value in value_changed's details", () => {
    expect(shareValueChangedDetailsSchema.parse({ priceEur: "40.50" })).toEqual(
      { priceEur: "40.50" },
    );
    expect(
      shareValueChangedDetailsSchema.safeParse({ priceEur: 40.5 }).success,
    ).toBe(false);
  });
});

describe("DELETE /shares/{id}/values/{at}", () => {
  it("is declared for members and the admin, with last_value_point", () => {
    const { route, meta, errorMap } = deleteShareValue["~orpc"];
    expect(route).toMatchObject({
      method: "DELETE",
      path: "/shares/{id}/values/{at}",
      successStatus: 204,
    });
    expect(meta.roles).toEqual(["admin", "member"]);
    expect(Object.keys(errorMap).sort()).toEqual(
      [...writeCodes, "value_changed", "last_value_point"].sort(),
    );
  });

  it("takes the value the editor last saw, in the body", () => {
    expect(
      shareValueDeleteBodySchema.safeParse({ expectedPriceEur: "40.10" })
        .success,
    ).toBe(true);
    expect(shareValueDeleteBodySchema.safeParse({}).success).toBe(false);
    expect(
      document.paths?.["/shares/{id}/values/{at}"]?.delete?.requestBody,
    ).toMatchObject({
      required: true,
      content: {
        "application/json": {
          schema: { required: ["expectedPriceEur"] },
        },
      },
    });
  });

  it("is in the OpenAPI document with 409 and 422", () => {
    const operation = document.paths?.["/shares/{id}/values/{at}"]?.delete;
    expect(operation?.responses).toMatchObject({
      "204": {},
      "409": { description: "`value_changed`" },
      "422": { description: "`last_value_point`" },
    });
  });
});
