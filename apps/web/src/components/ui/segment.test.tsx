import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as Segment from "./segment";

type Unit = "euro" | "percent";

function units(
  root: Partial<
    Pick<Segment.RootProps<Unit>, "backdrop" | "disabled" | "className">
  > = {},
): string {
  return renderToStaticMarkup(
    <Segment.Root<Unit>
      backdrop="sky"
      defaultValue="percent"
      aria-label="Unit"
      {...root}
    >
      <Segment.Item value="euro">€</Segment.Item>
      <Segment.Item value="percent">%</Segment.Item>
    </Segment.Root>,
  );
}

describe("Segment", () => {
  it("is a named group of toggle buttons, the selected one pressed", () => {
    const markup = units();
    expect(markup).toMatch(
      /role="group"[^>]*aria-label="Unit"|aria-label="Unit"[^>]*role="group"/,
    );
    expect(markup).toMatch(/<button[^>]*aria-pressed="false"[^>]*>€</);
    expect(markup).toMatch(/<button[^>]*aria-pressed="true"[^>]*>%</);
  });

  it("selects the owner's value over a default", () => {
    const markup = renderToStaticMarkup(
      <Segment.Root<Unit> backdrop="snow" value="euro" aria-label="Unit">
        <Segment.Item value="euro">€</Segment.Item>
        <Segment.Item value="percent">%</Segment.Item>
      </Segment.Root>,
    );
    expect(markup).toMatch(/<button[^>]*aria-pressed="true"[^>]*>€</);
  });

  it("draws a white track on the sky and a sand one on snow", () => {
    expect(units({ backdrop: "sky" })).toContain("bg-surface/75");
    expect(units({ backdrop: "snow" })).toContain("bg-divider/50");
  });

  it("takes a class, or a class from the group's state", () => {
    expect(units({ className: "mt-m" })).toContain("mt-m");
    expect(
      units({
        disabled: true,
        className: (state) => (state.disabled ? "opacity-50" : "mt-m"),
      }),
    ).toContain("opacity-50");
  });

  it("lets a class passed to an option win over its own", () => {
    const markup = renderToStaticMarkup(
      <Segment.Root<Unit> backdrop="sky" defaultValue="euro" aria-label="Unit">
        <Segment.Item value="euro" className="px-m">
          €
        </Segment.Item>
      </Segment.Root>,
    );
    expect(markup).toContain("px-m");
    expect(markup).not.toContain("px-[0.625rem]");
  });
});
