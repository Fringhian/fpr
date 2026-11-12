import { describe, expect, it } from "vitest";
import { type Members, membersSchema } from "./members.js";

const exampleFund = {
  id: "2d8b5e3a-ac4f-4e90-b132-4d5e6f7a8b92",
  isin: "IE00B4L5Y983",
  name: "Example World Fund",
  kind: "market",
  symbol: "EXW.XETRA",
} as const;

const exampleBank = {
  id: "5abe8b6d-df72-41c3-a465-7a8b9cadbec5",
  isin: "FR0000000019",
  name: "Example Bank SA",
  kind: "market",
  symbol: "EXB.PA",
} as const;

/** A close: 23:59:59 of its day in `RACE_TIMEZONE`. */
function close(on: string, balanceEur: string, eur: string, percent: string) {
  return {
    at: `${on}T23:59:59+01:00`,
    balanceEur,
    gain: { eur, percent },
    provisional: false,
    incomplete: false,
  };
}

const members: Members = {
  members: [
    {
      member: {
        id: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70",
        displayName: "Alex Martin",
        avatarUrl: null,
        color: 3,
      },
      firstEntryOn: "2026-02-12",
      measuredFrom: "2026-02-12",
      incomplete: false,
      gain: { eur: "512.00", percent: "4.32" },
      balanceEur: "12374.50",
      series: [
        close("2026-02-12", "11862.50", "0", "0"),
        close("2026-02-13", "11946.60", "84.10", "0.71"),
        close("2026-03-02", "12374.50", "512.00", "4.32"),
      ],
      topHoldings: [
        { share: exampleFund, weight: "46.2" },
        { share: exampleBank, weight: "25.0" },
      ],
      holdingCount: 2,
    },
    {
      member: {
        id: "1c7a4d2f-9b3e-4d8f-a021-3c4d5e6f7a81",
        displayName: "Sam Rivera",
        avatarUrl: null,
        color: 5,
      },
      firstEntryOn: null,
      measuredFrom: null,
      incomplete: false,
      gain: null,
      balanceEur: null,
      series: [],
      topHoldings: [],
      holdingCount: 0,
    },
  ],
};

describe("GET /members", () => {
  it("accepts members with euros and percent, a member not started among them", () => {
    expect(membersSchema.parse(members)).toEqual(members);
  });

  it("refuses more than three top holdings, a gain without its percent, and amounts as numbers", () => {
    const [alex] = members.members;
    const holding = { share: exampleFund, weight: "10" };
    const tooMany = {
      members: [{ ...alex, topHoldings: Array(4).fill(holding) }],
    };
    expect(membersSchema.safeParse(tooMany).success).toBe(false);
    const euroOnly = { members: [{ ...alex, gain: { eur: "512.00" } }] };
    expect(membersSchema.safeParse(euroOnly).success).toBe(false);
    const asNumber = { members: [{ ...alex, balanceEur: 12374.5 }] };
    expect(membersSchema.safeParse(asNumber).success).toBe(false);
  });
});
