import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import * as ShareLookup from "./share-lookup";

/** Create a manual share's page, as the router's `<Link>` would be. */
function CreateLink(props: ComponentProps<"a">) {
  return <a {...props} href="#new-share" />;
}

/** What an invented lookup found: a listing with an ISIN, stored, and one the provider sent without. */
const FOUND = {
  status: "found",
  shares: [
    {
      id: "00000000-0000-4000-8000-000000000010",
      isin: "IE00FPRPAC10",
      name: "Pacific Bond ETF",
      kind: "market",
      symbol: "PACB.DE",
    },
  ],
  listings: [
    {
      symbol: "PACB.LSE",
      name: "Pacific Bond ETF",
      exchange: "LSE",
      tradingCurrency: "GBP",
    },
  ],
} as const satisfies ShareLookup.State;

const DESCRIPTION = `
Finding a share FPR doesn’t know yet, at the price provider, under the Shares search, on the Shares page and in Record a change. Its \`state\` comes from the screen:

- **offer**: “Not here?” and the button that looks the text up. A full ISIN is looked up by itself, so it skips this.
- **looking**: one provider call under way.
- **found**: each share found, with Add, which opens it or picks it; a listing without an ISIN asks for one first.
- **none** and **failed**: the lookup found nothing new, or the provider couldn’t be asked (down, or FPR’s daily call budget used); both offer Create a manual share.

Import it as a namespace: \`import * as ShareLookup from "…/share-lookup"\`. Its parts are \`Offer\`, \`Looking\`, \`Found\` with \`FoundShare\` and \`FoundListing\`, and \`Missing\`; \`Basic\` picks them from \`state\`.
`;

const meta = {
  title: "Organisms/Share lookup",
  component: ShareLookup.Basic,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
  args: {
    query: "pacific",
    state: { status: "offer" },
    onLookUp: fn(),
    onAddShare: fn(),
    onAddListing: fn(),
    createLink: <CreateLink />,
  },
  argTypes: {
    query: { control: "text" },
    state: { control: "object" },
    adding: { control: "object" },
    createLink: { control: false },
  },
  render: (args) => (
    <div className="max-w-[35rem]">
      <ShareLookup.Basic {...args} />
    </div>
  ),
} satisfies Meta<typeof ShareLookup.Basic>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Under FPR's own matches: the button that looks the text up. */
export const Offer: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Look up/ }));
    await expect(args.onLookUp).toHaveBeenCalled();
  },
};

/** The provider is being asked. */
export const Looking: Story = { args: { state: { status: "looking" } } };

/** What the provider found: Add opens a share; a listing without an ISIN asks for one. */
export const Found: Story = {
  args: { state: FOUND },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const [, listing] = canvas.getAllByRole("button", { name: "Add" });
    if (listing) await userEvent.click(listing);
    const field = canvas.getByRole("textbox", { name: /ISIN of/ });
    await userEvent.type(field, "ie00fprpac2");
    await userEvent.click(canvas.getByRole("button", { name: "Add share" }));
    await expect(canvas.getByText(/Enter an ISIN/)).toBeVisible();
    await userEvent.type(field, "9");
    await userEvent.click(canvas.getByRole("button", { name: "Add share" }));
    await expect(args.onAddListing).toHaveBeenCalledWith(
      FOUND.listings[0],
      "IE00FPRPAC29",
    );
  },
};

/** The ISIN typed for a listing belongs to another share: a link opens it. */
export const IsinTaken: Story = {
  name: "ISIN taken",
  args: {
    state: FOUND,
    adding: {
      symbol: "PACB.LSE",
      adding: false,
      error: "Another share in FPR already has this ISIN.",
      takenLink: <a href="#share">Open</a>,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [, listing] = canvas.getAllByRole("button", { name: "Add" });
    if (listing) await userEvent.click(listing);
    await userEvent.type(
      canvas.getByRole("textbox", { name: /ISIN of/ }),
      "IE00FPRWLD01",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Add share" }));
    await expect(
      canvas.getByRole("link", { name: "Open that share" }),
    ).toBeVisible();
  },
};

/** Nothing found: Create a manual share is the main action. */
export const NothingFound: Story = {
  name: "Nothing found",
  args: { query: "LU00FPRNEW08", state: { status: "none", others: false } },
};

/** FPR's own shares matched, and the provider found nothing else. */
export const NothingElse: Story = {
  name: "Nothing else",
  args: { query: "world", state: { status: "none", others: true } },
};

/** The provider is down, or FPR's daily call budget is used: manual creation is still offered. */
export const Failed: Story = {
  args: {
    query: "acme",
    state: {
      status: "failed",
      error: "Today’s price lookups are used up. Try again tomorrow.",
    },
  },
};
