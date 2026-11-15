import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { initialOf, Picture, type PictureSize } from "./picture";

describe("initialOf", () => {
  it("is the name's first letter in capitals", () => {
    expect(initialOf("sam")).toBe("S");
    expect(initialOf("  Lea ")).toBe("L");
    expect(initialOf("élodie")).toBe("É");
  });

  it("keeps a letter with a combining accent whole", () => {
    expect(initialOf("émile")).toBe("É");
  });

  it("is empty for an empty name", () => {
    expect(initialOf("")).toBe("");
  });
});

describe("Picture", () => {
  it("is an image named by the person's name, with their initial", () => {
    const markup = renderToStaticMarkup(
      <Picture name="Sam" color="vermilion" size="s" />,
    );
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Sam"');
    expect(markup).toContain(">S</span>");
  });

  it("sits on the pastel of the person's colour", () => {
    const markup = renderToStaticMarkup(
      <Picture name="Alex" color="cobalt" size="s" />,
    );
    expect(markup).toContain("bg-cobalt-pastel");
  });

  it("shows the initial while the photo loads", () => {
    const markup = renderToStaticMarkup(
      <Picture name="Sam" color="vermilion" size="s" photo="/sam.webp" />,
    );
    expect(markup).toContain(">S</span>");
  });

  it("sizes 20, 28, 48 and 88 px", () => {
    const sizes: readonly [PictureSize, string][] = [
      ["xs", "1.25rem"],
      ["s", "1.75rem"],
      ["m", "3rem"],
      ["l", "5.5rem"],
    ];
    for (const [size, rem] of sizes) {
      const markup = renderToStaticMarkup(
        <Picture name="Sam" color="vermilion" size={size} />,
      );
      expect(markup).toContain(`size-[${rem}]`);
    }
  });

  it("rings a medal on tablet and desktop only", () => {
    const markup = renderToStaticMarkup(
      <Picture name="Sam" color="vermilion" size="s" medal="gold" />,
    );
    expect(markup).toContain("outline-gold");
    expect(markup).toContain("outline-0 tablet:outline-3 desktop:outline-3");
  });

  it("has no ring without a medal", () => {
    const markup = renderToStaticMarkup(
      <Picture name="Sam" color="vermilion" size="s" />,
    );
    expect(markup).not.toContain("outline");
  });

  it("takes className as a string or as a function of its state", () => {
    expect(
      renderToStaticMarkup(
        <Picture name="Sam" color="vermilion" size="s" className="mx-s" />,
      ),
    ).toMatch(/<span[^>]*class="[^"]*mx-s/);

    const byState = (state: { imageLoadingStatus: string }) =>
      state.imageLoadingStatus === "loaded" ? "is-photo" : "is-initial";

    expect(
      renderToStaticMarkup(
        <Picture name="Sam" color="vermilion" size="s" className={byState} />,
      ),
    ).toMatch(/<span[^>]*class="[^"]*is-initial/);
  });

  it("can be hidden from screen readers when the name is beside it", () => {
    const markup = renderToStaticMarkup(
      <Picture name="Sam" color="vermilion" size="s" aria-hidden />,
    );
    expect(markup).toContain('aria-hidden="true"');
  });
});
