import { DotsThreeIcon } from "@phosphor-icons/react/DotsThree";
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

  it("draws any Phosphor icon", () => {
    const close = renderToStaticMarkup(
      <IconButton icon={XIcon} label="Close" />,
    );
    const more = renderToStaticMarkup(
      <IconButton icon={DotsThreeIcon} label="Close" />,
    );

    expect(more).toMatch(/<svg/);
    expect(more).not.toBe(close);
  });

  it("takes className as a string or as a function of its state", () => {
    expect(
      renderToStaticMarkup(
        <IconButton icon={XIcon} label="Close" className="ml-auto" />,
      ),
    ).toMatch(/<button[^>]*class="[^"]*ml-auto/);

    const byState = (state: { disabled: boolean }) =>
      state.disabled ? "is-off" : "is-on";

    expect(
      renderToStaticMarkup(
        <IconButton icon={XIcon} label="Close" className={byState} />,
      ),
    ).toMatch(/<button[^>]*class="[^"]*is-on/);
    expect(
      renderToStaticMarkup(
        <IconButton icon={XIcon} label="Close" disabled className={byState} />,
      ),
    ).toMatch(/<button[^>]*class="[^"]*is-off/);
  });
});
