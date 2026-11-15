import { XIcon } from "@phosphor-icons/react/X";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IconButton } from "./icon-button";

describe("IconButton", () => {
  it("is a plain button named by its label, its icon hidden", () => {
    const markup = renderToStaticMarkup(
      <IconButton icon={XIcon} label="Close" />,
    );
    expect(markup).toContain('type="button"');
    expect(markup).toContain('aria-label="Close"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain('role="img"');
  });

  it("requires its label", () => {
    // @ts-expect-error: an icon button without a label says nothing to a screen reader.
    renderToStaticMarkup(<IconButton icon={XIcon} />);
  });

  it("is disabled natively", () => {
    const markup = renderToStaticMarkup(
      <IconButton icon={XIcon} label="Close" disabled />,
    );
    expect(markup).toMatch(/<button[^>]* disabled=""/);
  });
});
