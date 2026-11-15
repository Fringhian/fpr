import { describe, expect, it } from "vitest";
import {
  type RaceMember,
  raceLines,
  roleOf,
  spreadMarks,
} from "./race-card-model";

const points = [
  { day: "2026-03-02", value: "0.00" },
  { day: "2026-03-03", value: "1.20" },
];

const members: RaceMember[] = [
  { id: "sam", name: "Sam", color: "vermilion", points },
  { id: "alex", name: "Alex", color: "cobalt", points },
  { id: "lea", name: "Lea", color: "green", points },
  { id: "max", name: "Max", color: "violet", points },
];

describe("roleOf", () => {
  it("tells you, the focused member and the others apart", () => {
    const cast = { youId: "alex", focusId: "sam" };
    expect(roleOf("alex", cast)).toBe("you");
    expect(roleOf("sam", cast)).toBe("focus");
    expect(roleOf("lea", cast)).toBe("context");
  });

  it("keeps you as you when you focus yourself", () => {
    expect(roleOf("alex", { youId: "alex", focusId: "alex" })).toBe("you");
  });
});

describe("raceLines", () => {
  it("draws the others grey first, then you, then the focused member on top", () => {
    const lines = raceLines(members, {
      youId: "alex",
      focusId: "sam",
      youLabel: "You",
    });
    expect(lines.map((line) => line.id)).toEqual(["lea", "max", "alex", "sam"]);
    expect(lines.map((line) => line.color)).toEqual([
      "muted",
      "muted",
      "cobalt",
      "vermilion",
    ]);
    expect(lines.map((line) => line.emphasis)).toEqual([
      "context",
      "context",
      "focus",
      "focus",
    ]);
    expect(lines[2]?.label).toBe("You");
    expect(lines[3]?.label).toBe("Sam");
  });

  it("draws only the focused member in colour for a viewer with no portfolio", () => {
    const lines = raceLines(members, { focusId: "lea", youLabel: "You" });
    expect(lines.filter((line) => line.color !== "muted")).toHaveLength(1);
    expect(lines.at(-1)?.id).toBe("lea");
  });

  it("dashes every line after the last close", () => {
    const lines = raceLines(members, {
      youId: "alex",
      lastClose: "2026-03-02",
      youLabel: "You",
    });
    expect(lines.every((line) => line.dashedAfter === "2026-03-02")).toBe(true);
    expect(
      raceLines(members, { youLabel: "You" }).some(
        (line) => "dashedAfter" in line,
      ),
    ).toBe(false);
  });
});

describe("spreadMarks", () => {
  const bounds = { gap: 2, top: 0, bottom: 200 };

  it("leaves marks that don't overlap where their lines end", () => {
    const centres = spreadMarks(
      [
        { id: "a", y: 40, size: 20 },
        { id: "b", y: 100, size: 20 },
      ],
      bounds,
    );
    expect(centres.get("a")).toBe(40);
    expect(centres.get("b")).toBe(100);
  });

  it("pushes an overlapping mark down by its size and the gap", () => {
    const centres = spreadMarks(
      [
        { id: "b", y: 45, size: 20 },
        { id: "a", y: 40, size: 26 },
      ],
      bounds,
    );
    expect(centres.get("a")).toBe(40);
    expect(centres.get("b")).toBe(40 + 13 + 10 + 2);
  });

  it("keeps every mark inside the top and the bottom", () => {
    const centres = spreadMarks(
      [
        { id: "a", y: 2, size: 20 },
        { id: "b", y: 195, size: 20 },
        { id: "c", y: 198, size: 20 },
      ],
      bounds,
    );
    expect(centres.get("a")).toBe(10);
    expect(centres.get("c")).toBe(190);
    expect(centres.get("b")).toBe(168);
  });
});
