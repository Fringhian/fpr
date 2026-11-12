import { describe, expect, it } from "vitest";
import {
  type AdminShare,
  type AdminShareGroups,
  adminMakeManualSchema,
  adminShareGroupsSchema,
  adminShareSchema,
} from "./shares.js";

const id = "6a1d2c3b-4e5f-4a7b-8c9d-0e1f2a3b4c5d";

const fund: AdminShare = {
  id,
  isin: "FR0000000001",
  name: "Example World Fund",
  kind: "market",
  symbol: "EXW.PA",
  latestPrice: null,
  holders: [
    {
      id: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70",
      displayName: "Alex Martin",
      avatarUrl: null,
      color: 3,
    },
  ],
  hasShareChanges: true,
};

const groups: AdminShareGroups = {
  needsAttention: [fund],
  tracked: [
    {
      ...fund,
      latestPrice: {
        at: "2026-03-02T17:30:00+01:00",
        priceEur: "40.10",
        source: "intraday",
      },
    },
  ],
  manual: [{ ...fund, kind: "manual", symbol: null, holders: [] }],
  notHeld: [{ ...fund, holders: [], hasShareChanges: false }],
};

describe("adminShareGroupsSchema", () => {
  it("accepts every group, empty or not", () => {
    expect(adminShareGroupsSchema.parse(groups)).toEqual(groups);
    const empty = { needsAttention: [], tracked: [], manual: [], notHeld: [] };
    expect(adminShareGroupsSchema.parse(empty)).toEqual(empty);
  });

  it("refuses a missing group, or a share without its latest price or flag", () => {
    const { notHeld: _, ...withoutNotHeld } = groups;
    expect(adminShareGroupsSchema.safeParse(withoutNotHeld).success).toBe(
      false,
    );
    const { latestPrice: __, ...withoutPrice } = fund;
    expect(adminShareSchema.safeParse(withoutPrice).success).toBe(false);
    const { hasShareChanges: ___, ...withoutFlag } = fund;
    expect(adminShareSchema.safeParse(withoutFlag).success).toBe(false);
  });
});

describe("adminMakeManualSchema", () => {
  it("accepts a share alone, or with its first value", () => {
    expect(adminMakeManualSchema.parse({ id })).toEqual({ id });
    const withValue = {
      id,
      priceEur: "41.20",
      at: "2026-03-02T17:30:00+01:00",
    };
    expect(adminMakeManualSchema.parse(withValue)).toEqual(withValue);
  });

  it("refuses a price without its moment, a moment without its price, or a float", () => {
    expect(
      adminMakeManualSchema.safeParse({ id, priceEur: "41.20" }).success,
    ).toBe(false);
    expect(
      adminMakeManualSchema.safeParse({ id, at: "2026-03-02T17:30:00Z" })
        .success,
    ).toBe(false);
    expect(
      adminMakeManualSchema.safeParse({
        id,
        priceEur: 41.2,
        at: "2026-03-02T17:30:00Z",
      }).success,
    ).toBe(false);
  });
});
