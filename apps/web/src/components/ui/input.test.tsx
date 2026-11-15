import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Input } from "./input";

describe("Input", () => {
  it("opens the decimal keyboard for a decimal number, as a text input", () => {
    const markup = renderToStaticMarkup(
      <Input aria-label="Quantity" decimal />,
    );
    expect(markup).toContain('inputMode="decimal"');
    expect(markup).not.toContain('type="number"');
  });

  it("leaves the keyboard alone otherwise", () => {
    const markup = renderToStaticMarkup(<Input aria-label="Name" />);
    expect(markup).not.toContain("inputMode");
  });

  it("marks an invalid value for screen readers", () => {
    expect(
      renderToStaticMarkup(<Input aria-label="Quantity" invalid />),
    ).toContain('aria-invalid="true"');
    expect(renderToStaticMarkup(<Input aria-label="Quantity" />)).not.toContain(
      "aria-invalid",
    );
  });

  it("styles the box with className and passes the rest to the input", () => {
    const markup = renderToStaticMarkup(
      <Input aria-label="Name" className="max-w-l" name="displayName" />,
    );
    expect(markup).toMatch(/^<div class="[^"]*max-w-l/);
    expect(markup).toMatch(/<input[^>]*name="displayName"/);
  });

  it("renders the end slot after the input", () => {
    const markup = renderToStaticMarkup(
      <Input aria-label="Password" end={<button type="button">Show</button>} />,
    );
    expect(markup.indexOf("<input")).toBeLessThan(markup.indexOf("Show"));
  });
});
