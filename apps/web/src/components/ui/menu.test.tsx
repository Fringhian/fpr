import { DotsThreeIcon } from "@phosphor-icons/react/DotsThree";
import { DotsThreeVerticalIcon } from "@phosphor-icons/react/DotsThreeVertical";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../lib/i18n";
import type { Language } from "../../lib/language";
import * as Menu from "./menu";

function render(element: ReactElement, language: Language = "en"): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={createI18n(language)}>
      <Menu.Root>{element}</Menu.Root>
    </I18nextProvider>,
  );
}

/** The path data of an icon, which tells one icon from another in the markup. */
function glyph(icon: ReactElement): string {
  const markup = renderToStaticMarkup(icon);
  return markup.slice(markup.indexOf("<path"));
}

describe("Menu.MoreTrigger", () => {
  it("opens a menu and names what it acts on, in the reader’s language", () => {
    const markup = render(<Menu.MoreTrigger subject="Sam" />);
    expect(markup).toContain('aria-haspopup="menu"');
    expect(markup).toContain('aria-label="More actions for Sam"');
    expect(render(<Menu.MoreTrigger />, "fr")).toContain(
      'aria-label="Plus d’actions"',
    );
  });

  it("draws three dots by default, or any icon", () => {
    expect(render(<Menu.MoreTrigger />)).toContain(glyph(<DotsThreeIcon />));
    expect(render(<Menu.MoreTrigger icon={undefined} />)).toContain(
      glyph(<DotsThreeIcon />),
    );
    expect(render(<Menu.MoreTrigger icon={DotsThreeVerticalIcon} />)).toContain(
      glyph(<DotsThreeVerticalIcon />),
    );
  });

  it("takes className as a string or as a function of its state", () => {
    expect(render(<Menu.MoreTrigger className="ms-auto" />)).toMatch(
      /<button[^>]*class="[^"]*ms-auto/,
    );
    expect(
      render(
        <Menu.MoreTrigger
          className={(state) => (state.open ? "is-open" : "is-closed")}
        />,
      ),
    ).toMatch(/<button[^>]*class="[^"]*is-closed/);
  });
});
