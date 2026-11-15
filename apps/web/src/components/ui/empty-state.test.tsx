import { TrayIcon } from "@phosphor-icons/react/Tray";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as EmptyState from "./empty-state";

describe("EmptyState", () => {
  it("renders its title as an h2, its sentence as a paragraph, and hides the icon", () => {
    const markup = renderToStaticMarkup(
      <EmptyState.Root>
        <EmptyState.Icon icon={TrayIcon} />
        <EmptyState.Title>No shares yet</EmptyState.Title>
        <EmptyState.Description>
          Sam hasn’t recorded any shares yet.
        </EmptyState.Description>
      </EmptyState.Root>,
    );
    expect(markup).toMatch(/<h2[^>]*>No shares yet<\/h2>/);
    expect(markup).toMatch(/<p[^>]*>Sam hasn’t recorded any shares yet.<\/p>/);
    expect(markup).toContain('aria-hidden="true"');
  });

  it("takes another heading level through render", () => {
    const markup = renderToStaticMarkup(
      <EmptyState.Title render={(props) => <h1 {...props} />}>
        Your portfolio is empty
      </EmptyState.Title>,
    );
    expect(markup).toMatch(/^<h1[^>]*>Your portfolio is empty<\/h1>$/);
  });
});
