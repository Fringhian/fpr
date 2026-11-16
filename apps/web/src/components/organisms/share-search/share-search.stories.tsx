import type { Id, ShareQuote } from "@fpr/contracts";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { expect, userEvent, within } from "storybook/test";
import * as ShareSearch from "./share-search";

const AT = "2026-03-04T14:30:00+01:00";

/** Invented shares: two market listings, a manual fund, and one whose prices haven’t arrived. */
const ROWS: readonly [string, string, string | null, string | null][] = [
  ["World Index ETF", "IE00FPRWLD10", "WRLD.DE", "98.40"],
  ["Global Tech Fund", "LU00FPRTEC20", null, "40.10"],
  ["Nordic Wind AG", "DE00FPRWND30", "NWND.DE", "15.17"],
  ["Ocean Freight SA", "FR00FPROCN40", "OCNF.PA", null],
];

const SHARES: readonly ShareQuote[] = ROWS.map(
  ([name, isin, symbol, price], index): ShareQuote => ({
    id: `00000000-0000-4000-8000-00000000000${index}`,
    isin,
    name,
    kind: symbol === null ? "manual" : "market",
    symbol,
    latestPrice:
      price === null
        ? null
        : {
            at: AT,
            priceEur: price,
            source: symbol === null ? "manual" : "intraday",
          },
    change: null,
  }),
);

/** The story’s args: the search’s state. */
type SearchArgs = { state: "results" | "loading" | "failed" };

/** The search filtering the invented shares as it is typed. */
function Demo({ state }: SearchArgs) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Id | null>(null);

  const needle = q.trim().toLowerCase();
  const found = SHARES.filter((share) =>
    [share.name, share.isin, share.symbol ?? ""].some((field) =>
      field.toLowerCase().includes(needle),
    ),
  );
  return (
    <ShareSearch.Basic
      className="max-w-[35rem]"
      label={t("shareSearch.label")}
      q={q}
      onQChange={setQ}
      shares={state === "loading" ? undefined : found}
      error={state === "failed" ? t("errors.unreachable") : null}
      onRetry={() => undefined}
      value={picked}
      onValueChange={setPicked}
    />
  );
}

const DESCRIPTION = `
The Shares search, to pick one of FPR’s shares: the search box, then the shares matching what is typed, held ones first, each with its symbol, or “Manual”, and its latest price. Typing filters FPR’s own shares and costs no provider call. Import it as a namespace: \`import * as ShareSearch from "…/share-search"\`.

| Part | What it is |
| --- | --- |
| \`ShareSearch.Root\` | The search and what it found, stacked. |
| \`ShareSearch.Input\` | The search box: a magnifier, the text, and a cross that clears it. |
| \`ShareSearch.Results\` | The shares found, as options to pick one. |
| \`ShareSearch.Status\` | What stands in for the results: the first load, a failed search with Try again, or nothing found. |
| \`ShareSearch.Message\` | One line under the search. |
| \`ShareSearch.Basic\` | The search ready-made: \`q\`, \`shares\`, \`error\`, the share picked, kept listed first when the text typed leaves it out, and what follows the results as \`children\`. |

Record a change’s Which share step renders \`Basic\`; the Shares page composes the parts with its own cards.
`;

const meta = {
  title: "Organisms/Share search",
  component: Demo,
  subcomponents: {
    "ShareSearch.Basic": ShareSearch.Basic,
    "ShareSearch.Input": ShareSearch.Input,
    "ShareSearch.Results": ShareSearch.Results,
  },
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
  args: { state: "results" },
  argTypes: {
    state: {
      description:
        "`results`: the shares found; `loading`: the first answer on its way; `failed`: the search failed.",
      control: { type: "inline-radio" },
      options: ["results", "loading", "failed"],
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Every share, before anything is typed. */
export const Default: Story = {};

/** The first answer on its way. */
export const Loading: Story = { args: { state: "loading" } };

/** The search failed: why, and Try again. */
export const Failed: Story = { args: { state: "failed" } };

/** Typing filters the list; text that matches nothing says so; the cross clears it. */
export const Typing: Story = {
  tags: ["!autodocs"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const box = canvas.getByRole("searchbox");
    await userEvent.type(box, "wind");
    await expect(canvas.getAllByRole("radio")).toHaveLength(1);
    await userEvent.type(box, "xyz");
    await expect(canvas.queryAllByRole("radio")).toHaveLength(0);
    await userEvent.click(canvas.getByRole("button"));
    await expect(canvas.getAllByRole("radio")).toHaveLength(4);
  },
};

/** The share picked stays listed, selected, above the line saying nothing else matches. */
export const KeptPick: Story = {
  name: "Kept pick",
  tags: ["!autodocs"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: /Nordic Wind/ }));
    await userEvent.type(canvas.getByRole("searchbox"), "xyz");
    const radios = canvas.getAllByRole("radio");
    await expect(radios).toHaveLength(1);
    await expect(radios[0]).toHaveAttribute("aria-checked", "true");
    await expect(canvas.getByRole("status")).toBeVisible();
  },
};
