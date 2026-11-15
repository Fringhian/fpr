import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../lib/i18n";
import type { Language } from "../../lib/language";
import * as Menu from "./menu";
import { PersonList, PersonRow, type PersonRowProps } from "./person-row";

const SAM: PersonRowProps = {
  name: "Sam",
  color: "cobalt",
  email: "sam@example.com",
  status: "active",
  accessUntil: null,
  actions: <Menu.Item>Edit</Menu.Item>,
};

function render(
  props: Partial<PersonRowProps> = {},
  language: Language = "en",
): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={createI18n(language)}>
      <PersonList>
        <PersonRow {...SAM} {...props} />
      </PersonList>
    </I18nextProvider>,
  );
}

describe("PersonRow", () => {
  it("shows the name, the email and the status in a list item", () => {
    const html = render();
    expect(html).toMatch(/^<ul[^>]*><li/);
    expect(html).toContain(">Sam<");
    expect(html).toContain(">sam@example.com<");
    expect(html).toContain(">Active<");
  });

  it("names each access status with its badge", () => {
    expect(render({ status: "waiting" })).toContain(">Waiting for first use<");
    expect(render({ status: "expired" })).toContain(">Link expired<");
    expect(render({ status: "ended" })).toContain(">Ended<");
    expect(render({ status: "revoked" })).toContain(">Revoked<");
    expect(render({ status: "ended" }, "fr")).toContain(">Terminé<");
  });

  it("writes the end date with its year, in the reader's language", () => {
    expect(render({ accessUntil: "2027-06-30" })).toContain(
      ">Until 30 Jun 2027<",
    );
    expect(render({ accessUntil: "2027-06-30" }, "fr")).toContain(
      ">Jusqu’au 30 juin 2027<",
    );
  });

  it("draws a dash for no end date, and says it to screen readers", () => {
    const html = render();
    expect(html).toContain('<span aria-hidden="true">–</span>');
    expect(html).toContain('<span class="sr-only">No end date</span>');
  });

  it("hides the picture from screen readers, since the name is written beside it", () => {
    expect(render()).toMatch(/role="img"[^>]*aria-hidden="true"/);
  });

  it("leaves the email out when there is none", () => {
    expect(render({ email: null })).not.toContain("@");
  });

  it("has a ⋯ named for the person only when it has actions", () => {
    expect(render()).toContain('aria-label="More actions for Sam"');
    expect(render({ actions: undefined })).not.toContain("More actions");
  });
});
