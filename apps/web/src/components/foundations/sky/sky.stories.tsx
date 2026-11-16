import type { Meta, StoryObj } from "@storybook/react-vite";
import { cn } from "../../../lib/cn";
import { Card } from "../../atoms/card/card";
import * as Sky from "./sky";

/** Which of Sky's parts the page renders; its content stays the same. */
interface SkyParts {
  band: boolean;
  header: boolean;
}

const gutters = cn("", "px-m", "tablet:px-l", "desktop:px-l");

/** Stands in for the page bar, at its height in the design. */
function PageBar() {
  return (
    <p
      className={cn(
        "flex items-center text-l font-semibold",
        "h-[4.375rem]",
        "tablet:h-[5rem]",
        "desktop:h-[5rem]",
      )}
    >
      Home
    </p>
  );
}

/** A page's top, made of the parts the controls switch on. */
function SkyPage({ band, header }: SkyParts) {
  return (
    <Sky.Root className={cn("pb-xl font-sans text-primary", gutters)}>
      {band ? <Sky.Band /> : null}
      {header ? (
        <Sky.Header>
          <PageBar />
          <p className="text-m text-on-sky">Good evening, Alex</p>
          <h1
            className={cn(
              "font-semibold",
              "text-xl",
              "tablet:text-display",
              "desktop:text-display",
            )}
          >
            This month, you’re up €512 (+4.2%)
          </h1>
        </Sky.Header>
      ) : (
        <PageBar />
      )}
      <Card
        elevation="rest"
        render={<article />}
        className="grid max-w-[40rem] gap-xs p-m"
      >
        <h2 className="text-l font-semibold">The page’s first card</h2>
        <p className="text-s text-secondary">
          After the header, it starts just below the near ridge: 240px from the
          top on phone, 236px from tablet up. Without the header, it follows the
          page bar.
        </p>
      </Card>
    </Sky.Root>
  );
}

const DESCRIPTION = `
The page background: a peach sky behind the top of the page, closed by a lilac ridge at one fixed height, then warm snow. Import it as a namespace: \`import * as Sky from "…/sky"\`. Every part takes \`className\` and \`children\`, and nothing else.

| Part | What it is |
| --- | --- |
| \`Sky.Root\` | The page ground, warm snow. A page without a header sentence renders it alone. |
| \`Sky.Band\` | The sky behind the top of the page, closed by the ridge. |
| \`Sky.Header\` | The page bar and the header sentence, over the sky. Content starts right under it: 240px from the top on phone, 236px from tablet up. |
| \`Sky.Ridge\` | The ridge alone, for any sky panel that ends in it. |

- The ridge is one 600 × 64 tile, repeated across and never stretched: 52px high on phone, 64px from tablet up. Its top sits 206px from the top on phone, 200px from tablet up, on every page that has it. In an installed app, the sky reaches under the notch or status bar, and every height here counts from below that safe area.
- Only a page with a header sentence has the sky (Home, Portfolio, a member, a share), with \`Sky.Band\` and \`Sky.Header\` together. A header that doesn’t fit means no sky, never a moved ridge.

The controls switch each part on and off. On this page every story renders at the page’s own width, a desktop width: the **Phone** and **Tablet** stories in the sidebar show the narrower ones, and the viewport menu switches any story.
`;

const meta = {
  title: "Foundations/Sky and ridge",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: DESCRIPTION } },
  },
  args: { band: true, header: true },
  argTypes: {
    band: {
      name: "Sky.Band",
      description:
        "Renders the sky and its ridge. Off, the page starts on warm snow, as a page without a header sentence does.",
      control: { type: "boolean" },
    },
    header: {
      name: "Sky.Header",
      description:
        "Renders the header, which holds the page bar and the header sentence. Off, the content follows the page bar: with the sky, it sits up in the sky, above the ridge.",
      control: { type: "boolean" },
    },
  },
  render: (parts) => <SkyPage {...parts} />,
} satisfies Meta<SkyParts>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A page with the sky, its parts switched in the Controls panel. */
export const Desktop: Story = { globals: { viewport: { value: "desktop" } } };

/** The Docs page can't narrow a story, so the narrower widths live in the sidebar only. */
export const Tablet: Story = {
  tags: ["!autodocs"],
  globals: { viewport: { value: "tablet" } },
};

export const Phone: Story = {
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
};

/** The ridge alone closes any sky panel, such as the desktop step flow’s. Above its lobes it is transparent, over the sky. */
export const RidgeAlone: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className={cn("pt-l pb-xl", gutters)}>
      <div className="bg-sky pt-xl">
        <Sky.Ridge />
      </div>
    </div>
  ),
};
