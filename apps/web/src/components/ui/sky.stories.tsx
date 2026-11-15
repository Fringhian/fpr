import type { Meta, StoryObj } from "@storybook/react-vite";
import { cn } from "../../lib/cn";
import * as Sky from "./sky";

interface SkyPageProps {
  sky: boolean;
  title: string;
  greeting: string;
  sentence: string;
}

const gutters = cn("", "px-m", "tablet:px-l", "desktop:px-l");

/** Stands in for the page bar, at its height in the design. */
function PageBar({ title }: { title: string }) {
  return (
    <p
      className={cn(
        "flex items-center text-l font-semibold",
        "h-[4.375rem]",
        "tablet:h-[5rem]",
        "desktop:h-[5rem]",
      )}
    >
      {title}
    </p>
  );
}

/** A page's top, with or without the sky. */
function SkyPage({ sky, title, greeting, sentence }: SkyPageProps) {
  return (
    <main className="bg-page font-sans text-primary">
      {sky ? (
        <Sky.Root className={cn("pb-xl", gutters)}>
          <Sky.Band />
          <Sky.Header>
            <PageBar title={title} />
            <p className="text-m text-on-sky">{greeting}</p>
            <h1
              className={cn(
                "font-semibold",
                "text-xl",
                "tablet:text-display",
                "desktop:text-display",
              )}
            >
              {sentence}
            </h1>
          </Sky.Header>
          <article className="grid max-w-[40rem] gap-xs rounded-l bg-surface p-m shadow-rest">
            <h2 className="text-l font-semibold">
              The main card starts under the ridge
            </h2>
            <p className="text-s text-secondary">
              Content starts right under the header: 240px from the page top on
              phone, 236px from tablet up, just below the near ridge, so the
              whole ridge shows above the card.
            </p>
          </article>
        </Sky.Root>
      ) : (
        <Sky.Root className={cn("pb-xl", gutters)}>
          <PageBar title={title} />
          <article className="grid max-w-[40rem] gap-xs rounded-l bg-surface p-m shadow-outline">
            <h2 className="text-l font-semibold">Cards rest on the snow</h2>
            <p className="text-s text-secondary">
              A page without a header sentence starts on warm snow, with no
              ridge: Members, Shares, admin, help, and the step flows on phone.
            </p>
          </article>
        </Sky.Root>
      )}
    </main>
  );
}

const DESCRIPTION = `
The page background: a peach sky behind the top of the page, closed by a lilac ridge at one fixed height, then warm snow. Import it as a namespace: \`import * as Sky from "…/sky"\`.

| Part | What it is |
| --- | --- |
| \`Sky.Root\` | The page ground, warm snow. A page without a header sentence renders it alone. |
| \`Sky.Band\` | The sky behind the top of the page, closed by the ridge. |
| \`Sky.Header\` | The page bar and the header sentence, over the sky. Content starts right under it: 240px from the top on phone, 236px from tablet up. |
| \`Sky.Ridge\` | The ridge alone, for any sky panel that ends in it. |

- The ridge is one 600 × 64 tile, repeated across and never stretched: 52px high on phone, 64px from tablet up. Its top sits 206px from the top on phone, 200px from tablet up, on every page that has it.
- Only a page with a header sentence has the sky (Home, Portfolio, a member, a share). A header that doesn’t fit means no sky, never a moved ridge.

On this page every story renders at the page’s own width, a desktop width. The **Phone** and **Tablet** stories in the sidebar show the narrower ones, and the viewport menu switches any story.
`;

const meta = {
  title: "Foundations/Sky and ridge",
  component: SkyPage,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: DESCRIPTION } },
  },
  args: {
    sky: true,
    title: "Home",
    greeting: "Good evening, Alex",
    sentence: "This month, you’re up €512 (+4.2%)",
  },
  argTypes: {
    sky: {
      description:
        "The sky and its ridge, for a page with a header sentence. Without it, the page starts on warm snow.",
      control: { type: "boolean" },
    },
    title: {
      description: "The page bar’s title.",
      control: { type: "text" },
    },
    greeting: {
      description: "The line above the header sentence, on the sky.",
      control: { type: "text" },
      if: { arg: "sky" },
    },
    sentence: {
      description:
        "The header sentence. One too long for the header means the page has no sky.",
      control: { type: "text" },
      if: { arg: "sky" },
    },
  },
} satisfies Meta<typeof SkyPage>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The page with the sky, configured in the Controls panel. */
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

/** A page without a header sentence: no sky, no ridge. */
export const WithoutSky: Story = { args: { sky: false } };

/** The ridge alone closes any sky panel, such as the desktop step flow’s. Above its lobes it is transparent, over the sky. */
export const RidgeAlone: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <main className={cn("bg-page pt-l pb-xl", gutters)}>
      <div className="bg-sky pt-xl">
        <Sky.Ridge />
      </div>
    </main>
  ),
};
