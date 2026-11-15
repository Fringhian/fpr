import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TrailSign } from "./trail-sign";

describe("TrailSign", () => {
  it("draws a charcoal outline", () => {
    const markup = renderToStaticMarkup(<TrailSign>You +4.2%</TrailSign>);
    expect(markup).toContain("shadow-[0_0_0_1.5px_var(--color-primary)]");
    expect(markup).toContain("You +4.2%");
  });

  it("tightens its start around a picture", () => {
    const plain = renderToStaticMarkup(<TrailSign>€12,374</TrailSign>);
    const withPicture = renderToStaticMarkup(
      <TrailSign picture={<span>S</span>}>Sam leads</TrailSign>,
    );
    expect(plain).toContain("pl-[0.75rem]");
    expect(withPicture).toContain("pl-[0.1875rem]");
    expect(withPicture).toContain("<span>S</span>Sam leads");
  });
});
