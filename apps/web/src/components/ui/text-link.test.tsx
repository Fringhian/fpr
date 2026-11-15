import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TextLink } from "./text-link";

describe("TextLink", () => {
  it("is an underlined link with no icon by default", () => {
    const markup = renderToStaticMarkup(
      <TextLink href="/help">How FPR works</TextLink>,
    );
    expect(markup).toMatch(/^<a href="\/help" class="[^"]*underline/);
    expect(markup).not.toContain("<svg");
  });

  it("ends with a caret when it goes to a page", () => {
    const markup = renderToStaticMarkup(
      <TextLink href="/members/1" toPage>
        Open Sam’s page
      </TextLink>,
    );
    const caret = renderToStaticMarkup(<CaretRightIcon />);
    expect(markup).toContain(caret.slice(caret.indexOf("<path")));
  });

  it("takes any icon to end with", () => {
    const markup = renderToStaticMarkup(
      <TextLink href="/members/1" toPage toPageIcon={ArrowRightIcon}>
        Open Sam’s page
      </TextLink>,
    );
    const arrow = renderToStaticMarkup(<ArrowRightIcon />);
    expect(markup).toContain(arrow.slice(arrow.indexOf("<path")));
  });

  it("renders as the element `render` gives, keeping its look", () => {
    const markup = renderToStaticMarkup(
      <TextLink render={<button type="button" />}>Show all</TextLink>,
    );
    expect(markup).toMatch(/^<button type="button" class="[^"]*text-link/);
  });
});
