// @vitest-environment happy-dom
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { changeLanguage } from "../src/lib/language-choice.ts";
import { fixturePersonId } from "../src/mocks/fixtures/people.ts";
import { visit } from "./visit-app.tsx";

const KEY = "fpr.language.v1";

/** The language the page shows, and the one kept on the device. */
function shown() {
  return {
    lang: document.documentElement.lang,
    kept: localStorage.getItem(KEY),
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("the page's language", () => {
  it("is French before any pick, whatever the browser's language", async () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-GB", "en"]);
    const { text } = await visit("/sign-in?access=ended", "signedOut", {
      language: null,
    });
    expect(document.documentElement.lang).toBe("fr");
    expect(text).toContain("Votre accès a pris fin");
  });

  it("switches at once on a pick before sign-in, which the next visit follows", async () => {
    const first = await visit("/sign-in", "signedOut", { language: null });
    await act(() => changeLanguage("en", first.router.options.context));
    expect(shown()).toEqual({ lang: "en", kept: "en" });

    const { text } = await visit("/sign-in?access=ended", "signedOut", {
      language: "en",
    });
    expect(text).toContain("Your access has ended");
  });

  it("is the person's own once signed in, and the device keeps it", async () => {
    await visit("/", "member", { language: "fr" });
    expect(shown()).toEqual({ lang: "en", kept: "en" });
  });

  it("is the device's for a person who never picked one", async () => {
    await visit("/", fixturePersonId("robin"), { language: "en" });
    expect(shown()).toEqual({ lang: "en", kept: "en" });
  });

  it("changes on the account of a signed-in person, at once", async () => {
    const { router } = await visit("/", "member");
    const { api } = router.options.context;
    await act(() => changeLanguage("fr", router.options.context));
    expect(shown()).toEqual({ lang: "fr", kept: "fr" });
    expect((await api.me.get.call()).language).toBe("fr");
  });

  it("stays on the device for an anonymous viewer", async () => {
    const { router } = await visit("/", "anonymous", { language: null });
    expect(shown().lang).toBe("fr");
    await act(() => changeLanguage("en", router.options.context));
    expect(shown()).toEqual({ lang: "en", kept: "en" });
  });
});
