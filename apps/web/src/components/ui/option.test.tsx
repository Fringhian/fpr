import { MinusIcon } from "@phosphor-icons/react/Minus";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as Option from "./option";

function question(defaultValue?: "bought" | "sold"): string {
  return renderToStaticMarkup(
    <Option.Group aria-label="What changed?" defaultValue={defaultValue}>
      <Option.Item
        value="bought"
        icon={PlusIcon}
        title="Bought shares"
        description="Added to a holding or a new one"
      />
      <Option.Item
        value="sold"
        icon={MinusIcon}
        title="Sold shares"
        description="Part or all of a holding"
      />
    </Option.Group>,
  );
}

describe("Option", () => {
  it("is a radio group of radios", () => {
    const markup = question();
    expect(markup).toMatch(/role="radiogroup"[^>]*aria-label="What changed\?"/);
    expect(markup.match(/role="radio"/g)).toHaveLength(2);
    expect(markup).not.toContain('aria-checked="true"');
  });

  it("names each option by its title and describes it by its line", () => {
    const markup = question();
    const radio = markup.match(/<span[^>]*role="radio"[^>]*>/)?.[0] ?? "";
    const labelledBy = radio.match(/aria-labelledby="([^"]+)"/)?.[1];
    const describedBy = radio.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(markup).toMatch(
      new RegExp(`id="${labelledBy}"[^>]*>Bought shares<`),
    );
    expect(markup).toMatch(
      new RegExp(`id="${describedBy}"[^>]*>Added to a holding or a new one<`),
    );
  });

  it("checks the selected option only", () => {
    const markup = question("sold");
    const checked = markup.match(/<span[^>]*aria-checked="true"[^>]*>/g) ?? [];
    expect(checked).toHaveLength(1);
    expect(checked[0]).toContain("data-checked");
  });
});
