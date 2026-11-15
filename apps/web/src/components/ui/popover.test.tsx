import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import { InfoIcon } from "@phosphor-icons/react/Info";
import { QuestionIcon } from "@phosphor-icons/react/Question";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../lib/i18n";
import type { Language } from "../../lib/language";
import * as Popover from "./popover";

function render(element: ReactElement, language: Language = "en"): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={createI18n(language)}>
      <Popover.Root>{element}</Popover.Root>
    </I18nextProvider>,
  );
}

/** The path data of an icon, which tells one icon from another in the markup. */
function glyph(icon: ReactElement): string {
  const markup = renderToStaticMarkup(icon);
  return markup.slice(markup.indexOf("<path"));
}

describe("Popover.InfoTrigger", () => {
  it("opens a dialog and is named by its label", () => {
    const markup = render(<Popover.InfoTrigger label="What the race shows" />);
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain('aria-label="What the race shows"');
  });

  it("draws an info sign by default, or any icon", () => {
    expect(render(<Popover.InfoTrigger label="Why" />)).toContain(
      glyph(<InfoIcon />),
    );
    expect(
      render(<Popover.InfoTrigger label="Why" icon={QuestionIcon} />),
    ).toContain(glyph(<QuestionIcon />));
  });

  it("takes className as a string or as a function of its state", () => {
    expect(
      render(<Popover.InfoTrigger label="Why" className="ms-xs" />),
    ).toMatch(/<button[^>]*class="[^"]*ms-xs/);
    expect(
      render(
        <Popover.InfoTrigger
          label="Why"
          className={(state) => (state.open ? "is-open" : "is-closed")}
        />,
      ),
    ).toMatch(/<button[^>]*class="[^"]*is-closed/);
  });
});

describe("Popover.HelpLink", () => {
  it("links to its section of How FPR works, in the reader’s language", () => {
    const markup = render(<Popover.HelpLink section="cash" />);
    expect(markup).toMatch(/<a href="\/help#cash"/);
    expect(markup).toContain("More in How FPR works");
    expect(render(<Popover.HelpLink section="cash" />, "fr")).toContain(
      "En savoir plus dans Comment fonctionne FPR",
    );
  });

  it("ends with a caret by default, or any icon", () => {
    expect(render(<Popover.HelpLink section="cash" />)).toContain(
      glyph(<CaretRightIcon />),
    );
    expect(
      render(<Popover.HelpLink section="cash" toPageIcon={ArrowRightIcon} />),
    ).toContain(glyph(<ArrowRightIcon />));
  });
});
