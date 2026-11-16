import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { expect, within } from "storybook/test";
import { api } from "../lib/api/api.ts";
import { useErrorText } from "../lib/api/errors.ts";
import { createQueryClient } from "../lib/api/query-client.ts";
import { formatPercent } from "../lib/format/money.ts";
import { useLanguage } from "../lib/i18n.ts";
import { mockApi } from "./storybook.ts";

/** Who the mock API signs in, and the gain standings it answers them with. */
function MockApiPreview() {
  const me = useQuery(api.me.get.queryOptions());
  const board = useQuery(
    api.race.leaderboard.queryOptions({
      input: { board: "gain", period: "1M", unit: "percent" },
    }),
  );
  const errorText = useErrorText();
  const language = useLanguage();

  if (me.isError) {
    return <p className="p-m text-s text-primary">{errorText(me.error)}</p>;
  }
  return (
    <section
      className="flex max-w-[24rem] flex-col gap-s p-m text-s text-primary"
      aria-labelledby="mock-api-title"
    >
      <h2 id="mock-api-title" className="text-m font-semibold">
        {me.data === undefined
          ? "…"
          : `${me.data.displayName} · ${me.data.role}`}
      </h2>
      <ol className="flex flex-col gap-xs">
        {board.data?.board === "gain"
          ? board.data.rows.map((row) => (
              <li
                key={row.member.id}
                className="flex justify-between gap-m tabular-nums"
              >
                <span>{row.member.displayName}</span>
                <span>
                  {row.gain.percent === null
                    ? "—"
                    : formatPercent(row.gain.percent, language, {
                        signed: true,
                      })}
                </span>
              </li>
            ))
          : null}
      </ol>
    </section>
  );
}

/**
 * The mock API, which every screen's stories run on: `parameters.msw` set to
 * `mockApi({ session })` answers each route from the contracts' fixtures,
 * signed in as that persona. An anonymous viewer's answers are anonymized.
 * One page holds one set of handlers, so these stories have no Docs page,
 * which would draw them all with the last story's.
 */
const meta = {
  title: "Mocks/Mock API",
  component: MockApiPreview,
  tags: ["!autodocs"],
  decorators: [
    (Story) => {
      const [queryClient] = useState(createQueryClient);
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof MockApiPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Member: Story = {
  parameters: { msw: mockApi({ session: "member" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Sam Dubois · member")).toBeVisible();
    await expect(await canvas.findByText("Robin Leclerc")).toBeVisible();
  },
};

export const Admin: Story = {
  parameters: { msw: mockApi({ session: "admin" }) },
};

export const Guest: Story = {
  parameters: { msw: mockApi({ session: "guest" }) },
};

export const Anonymous: Story = {
  parameters: { msw: mockApi({ session: "anonymous" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/· anonymous$/)).toBeVisible();
    await expect(canvas.queryByText("Robin Leclerc")).toBeNull();
  },
};

export const SignedOut: Story = {
  parameters: { msw: mockApi({ session: "signedOut" }) },
};
