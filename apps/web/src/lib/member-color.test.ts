import { describe, expect, it } from "vitest";
import { MEMBER_COLORS, memberColor } from "./member-color";

describe("memberColor", () => {
  it("names colours 1 to 10 in order", () => {
    expect(memberColor(1)).toBe("vermilion");
    expect(memberColor(2)).toBe("cobalt");
    expect(memberColor(10)).toBe("periwinkle");
    expect(MEMBER_COLORS).toHaveLength(10);
  });

  it("throws outside 1 to 10", () => {
    expect(() => memberColor(0)).toThrow(RangeError);
    expect(() => memberColor(11)).toThrow(RangeError);
    expect(() => memberColor(1.5)).toThrow(RangeError);
  });
});
