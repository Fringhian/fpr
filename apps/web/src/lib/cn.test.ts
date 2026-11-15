import { cva } from "class-variance-authority";
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

  it("keeps the focus ring beside the other focus classes", () => {
    expect(
      cn(
        "bg-surface",
        "focus-visible:bg-highlight",
        "focus-visible:focus-ring",
      ),
    ).toBe("bg-surface focus-visible:bg-highlight focus-visible:focus-ring");
  });
});

describe("cn with cva", () => {
  const capsule = cva(
    [
      "rounded-full font-semibold",
      "",
      "",
      "",
      "focus-visible:focus-ring",
      "disabled:opacity-[0.45]",
    ],
    {
      variants: {
        intent: {
          primary: [
            "bg-primary text-on-primary",
            "",
            "",
            "",
            "hover:bg-secondary",
          ],
          secondary: [
            "bg-surface text-primary",
            "",
            "",
            "",
            "hover:bg-highlight",
          ],
        },
        size: {
          s: ["text-s", "px-s", "tablet:px-s", "desktop:px-s"],
          m: ["text-m", "px-m", "tablet:px-l", "desktop:px-l"],
        },
      },
      defaultVariants: { intent: "primary", size: "m" },
    },
  );

  it("joins the breakpoint and state groups of the chosen variants", () => {
    expect(cn(capsule({ intent: "secondary", size: "s" }))).toBe(
      "rounded-full font-semibold focus-visible:focus-ring disabled:opacity-[0.45] bg-surface text-primary hover:bg-highlight text-s px-s tablet:px-s desktop:px-s",
    );
  });

  it("lets a className override a variant through the theme's scales", () => {
    expect(cn(capsule(), "text-s text-secondary tablet:px-m")).toBe(
      "rounded-full font-semibold focus-visible:focus-ring disabled:opacity-[0.45] bg-primary hover:bg-secondary px-m desktop:px-l text-s text-secondary tablet:px-m",
    );
  });
});
