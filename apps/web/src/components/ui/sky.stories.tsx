import type { Meta, StoryObj } from "@storybook/react-vite";
import { cn } from "../../lib/cn";
import * as Sky from "./sky";

/** Both page grounds: with the sky and its ridge, then on snow alone. */
function SkyAndRidge() {
  return (
    <main className="min-h-dvh bg-page font-sans text-primary">
      <Sky.Root className={cn("pb-xl", "px-m", "tablet:px-l", "desktop:px-l")}>
        <Sky.Band />
        <header
          className={cn(
            "flex flex-col justify-between pt-m pb-l",
            "h-[12.875rem]",
            "tablet:h-[12.5rem]",
            "desktop:h-[12.5rem]",
          )}
        >
          <p className="text-m font-semibold">With sky</p>
          <div>
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
          </div>
        </header>
        <article className="grid max-w-[40rem] gap-xs rounded-l bg-surface p-m shadow-rest">
          <h2 className="text-l font-semibold">
            The main card starts on the ridge
          </h2>
          <p className="text-s text-secondary">
            The ridge is one 600 × 64 tile, repeated across and never stretched:
            52px high on phone, 64px from tablet up. Its top sits 206px from the
            page top on phone, 200px from tablet up, on every page that has it.
          </p>
        </article>
      </Sky.Root>
      <Sky.Root
        className={cn(
          "border-t-2 border-divider pt-l pb-xl",
          "px-m",
          "tablet:px-l",
          "desktop:px-l",
        )}
      >
        <h2 className="text-xl font-semibold">Without sky</h2>
        <p className="mt-xs mb-l max-w-[70ch] text-m text-secondary">
          A page without a header sentence starts on warm snow, with no ridge:
          Members, Shares, admin, help, and the step flows on phone.
        </p>
        <article className="grid max-w-[40rem] gap-xs rounded-l bg-surface p-m shadow-outline">
          <h3 className="text-l font-semibold">Cards rest on the snow</h3>
          <p className="text-s text-secondary">
            A header too tall for the band gets no sky rather than a moved
            ridge.
          </p>
        </article>
      </Sky.Root>
      <section
        className={cn(
          "border-t-2 border-divider pt-l pb-xl",
          "px-m",
          "tablet:px-l",
          "desktop:px-l",
        )}
      >
        <h2 className="text-xl font-semibold">The ridge alone</h2>
        <p className="mt-xs mb-l max-w-[70ch] text-m text-secondary">
          The ridge part closes any sky panel, such as the desktop step flow’s.
          Above its lobes it is transparent, over the sky.
        </p>
        <div className="bg-sky pt-xl">
          <Sky.Ridge />
        </div>
      </section>
    </main>
  );
}

const meta = {
  title: "Foundations/Sky and ridge",
  component: SkyAndRidge,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof SkyAndRidge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Phone: Story = { globals: { viewport: { value: "phone" } } };

export const Tablet: Story = { globals: { viewport: { value: "tablet" } } };

export const Desktop: Story = { globals: { viewport: { value: "desktop" } } };
