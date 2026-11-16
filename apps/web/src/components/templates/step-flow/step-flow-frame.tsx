import { useRender } from "@base-ui/react/use-render";
import type { ComponentProps } from "react";
import { cn } from "../../../lib/cn";
import * as Sky from "../../foundations/sky/sky";

/**
 * The focused page, with no navigation: the step's column, then on desktop
 * the sky panel beside it. It fills the viewport's height, on snow.
 */
export function Root({ className, ...props }: ComponentProps<"div">) {
  return (
    <Sky.Root
      {...props}
      className={cn(
        "flex min-h-dvh text-primary",
        "flex-col",
        "tablet:flex-col",
        "desktop:flex-row",
        className,
      )}
    />
  );
}

/**
 * The step's column, the page's `<main>`: the header, the progress, the
 * question, then the main button. Full width with 16px gutters and the
 * viewport's height on phone; one centred 560px column on tablet; 500px on
 * the left on desktop. `render` draws it as another element.
 */
export function Column({
  render,
  ref,
  className,
  ...props
}: useRender.ComponentProps<"main">) {
  return useRender({
    render,
    ref,
    defaultTagName: "main",
    props: {
      ...props,
      className: cn(
        "flex shrink-0 flex-col",
        "mx-0 min-h-dvh w-full max-w-none px-m",
        "tablet:mx-auto tablet:min-h-0 tablet:w-full tablet:max-w-[35rem] tablet:px-0",
        "desktop:mx-0 desktop:min-h-dvh desktop:w-[31.25rem] desktop:max-w-none desktop:px-[2.75rem]",
        className,
      ),
    },
  });
}

/**
 * The sky panel, on desktop only, right of the column: what the step
 * changes, such as the change being recorded, centred on the sky. It keeps
 * the viewport's height while the column scrolls, so its ridge, at its
 * bottom, never moves between steps. Phone and tablet have no sky: a step
 * that needs its content shows it in the column.
 */
export function Panel({
  className,
  children,
  ...props
}: ComponentProps<"aside">) {
  return (
    <aside
      {...props}
      className={cn(
        "sticky top-0 h-dvh min-w-0 flex-1 flex-col items-center justify-center gap-m bg-sky px-xl pt-xl pb-[6.5rem]",
        "hidden",
        "tablet:hidden",
        "desktop:flex",
        className,
      )}
    >
      {children}
      <Sky.Ridge className="absolute inset-x-0 bottom-0" />
    </aside>
  );
}
