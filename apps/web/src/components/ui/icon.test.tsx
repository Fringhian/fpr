import { HouseIcon } from "@phosphor-icons/react/House";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Icon } from "./icon";

describe("Icon", () => {
  it("is hidden from screen readers without a label", () => {
    const markup = renderToStaticMarkup(<Icon icon={HouseIcon} size="m" />);
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain("role=");
    expect(markup).not.toContain("aria-label");
  });

  it("is hidden from screen readers with an empty label", () => {
    const markup = renderToStaticMarkup(
      <Icon icon={HouseIcon} size="m" label="" />,
    );
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain("role=");
  });

  it("is an image named by its label", () => {
    const markup = renderToStaticMarkup(
      <Icon icon={HouseIcon} size="m" label="Home" />,
    );
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Home"');
    expect(markup).not.toContain("aria-hidden");
  });

  it("sizes 16, 20 and 24 px", () => {
    expect(renderToStaticMarkup(<Icon icon={HouseIcon} size="s" />)).toContain(
      "size-m",
    );
    expect(renderToStaticMarkup(<Icon icon={HouseIcon} size="m" />)).toContain(
      "size-[1.25rem]",
    );
    expect(renderToStaticMarkup(<Icon icon={HouseIcon} size="l" />)).toContain(
      "size-l",
    );
  });

  it("lets a class passed in override the size", () => {
    const markup = renderToStaticMarkup(
      <Icon icon={HouseIcon} size="s" className="size-xl" />,
    );
    expect(markup).toContain('class="shrink-0 size-xl"');
  });

  it("draws the fill weight apart from the regular one", () => {
    const regular = renderToStaticMarkup(<Icon icon={HouseIcon} size="m" />);
    const fill = renderToStaticMarkup(
      <Icon icon={HouseIcon} size="m" weight="fill" />,
    );
    expect(fill).not.toBe(regular);
  });
});
