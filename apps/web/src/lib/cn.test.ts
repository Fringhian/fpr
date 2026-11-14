import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("keeps one class per breakpoint", () => {
    expect(cn("bg-primary", "p-0", "tablet:p-xs", "desktop:p-xs")).toBe(
      "bg-primary p-0 tablet:p-xs desktop:p-xs",
    );
  });

  it("keeps a text size and a text colour together", () => {
    for (const size of ["xs", "s", "m", "l", "xl", "display"]) {
      expect(cn(`text-${size}`, "text-secondary")).toBe(
        `text-${size} text-secondary`,
      );
    }
  });

  it("lets the last text size win", () => {
    expect(cn("text-s", "text-display")).toBe("text-display");
  });

  it("lets the last spacing win", () => {
    expect(cn("p-m", "p-l")).toBe("p-l");
    expect(cn("gap-xs", "gap-xl")).toBe("gap-xl");
  });

  it("reads rounded-s and rounded-l as radius tokens", () => {
    expect(cn("rounded-s", "rounded-l")).toBe("rounded-l");
    expect(cn("rounded-l", "rounded-full")).toBe("rounded-full");
    expect(cn("rounded-m", "rounded-s")).toBe("rounded-s");
  });

  it("reads the shadows as shadows, not shadow colours", () => {
    expect(cn("shadow-outline", "shadow-rest")).toBe("shadow-rest");
    expect(cn("shadow-float", "shadow-primary")).toBe(
      "shadow-float shadow-primary",
    );
  });

  it("lets the last colour of a role win", () => {
    expect(cn("bg-surface", "bg-highlight")).toBe("bg-highlight");
  });

  it("keeps state groups apart from the resting value", () => {
    expect(cn("bg-surface", "hover:bg-highlight")).toBe(
      "bg-surface hover:bg-highlight",
    );
  });

  it("drops empty and false groups", () => {
    expect(cn("", "inline", false, undefined, "tablet:hidden")).toBe(
      "inline tablet:hidden",
    );
  });
});
