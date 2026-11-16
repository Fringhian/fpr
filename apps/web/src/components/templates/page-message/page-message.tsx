import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../../lib/cn";
import * as EmptyState from "../../molecules/empty-state/empty-state";

export type PageMessageProps = {
  /** The state's icon, any Phosphor icon: a question mark for a missing page. */
  icon: EmptyState.IconProps["icon"];
  /** What happened, the page's heading: “Page not found”. */
  title: ReactNode;
  /** One sentence that says what to do next. */
  description: ReactNode;
  /** The way on, such as a `Button` to Home or Retry. None for a message nothing follows. */
  action?: ReactNode;
} & Omit<ComponentProps<"div">, "title">;

/**
 * A page that is only a message: its state icon, its heading, one sentence,
 * and the way on, centred under the top of the page. A missing page, a page
 * that failed to load, and the admin area on a phone show it in place of the
 * page's content.
 */
export function PageMessage({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: PageMessageProps) {
  return (
    <EmptyState.Root
      {...props}
      className={cn(
        "",
        "pt-[3.75rem]",
        "tablet:pt-[6rem]",
        "desktop:pt-[6rem]",
        className,
      )}
    >
      <EmptyState.Icon icon={icon} />
      <EmptyState.Title
        render={(heading) => <h1 {...heading} />}
        className="text-xl"
      >
        {title}
      </EmptyState.Title>
      <EmptyState.Description className="text-pretty">
        {description}
      </EmptyState.Description>
      {action ? <EmptyState.Action>{action}</EmptyState.Action> : null}
    </EmptyState.Root>
  );
}
