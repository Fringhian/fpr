import type { IsoDate, Timestamp } from "@fpr/contracts";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../../lib/cn";
import { formatDate } from "../../../lib/format/date";
import { useLanguage } from "../../../lib/i18n";
import { Icon, type IconProps } from "../../foundations/icon/icon";
import * as Menu from "../menu/menu";

/** The list a page's rows go in, newest first, each row ruled off from the next. */
export function List({ className, ...props }: ComponentProps<"ol">) {
  return <ol {...props} className={cn("grid", className)} />;
}

/** One row: the day, the marker, the text, then the actions, in four columns. */
export function Root({ className, ...props }: ComponentProps<"li">) {
  return (
    <li
      {...props}
      className={cn(
        "grid items-center gap-[0.75rem] border-b-[1.5px] border-divider py-[0.625rem] font-sans",
        "grid-cols-[3.5rem_auto_minmax(0,1fr)_auto]",
        "tablet:grid-cols-[4rem_auto_minmax(0,1fr)_auto]",
        "desktop:grid-cols-[4rem_auto_minmax(0,1fr)_auto]",
        "last:border-b-0",
        className,
      )}
    />
  );
}

export type DayProps = {
  /** The day the change or value is for: a calendar day or a timestamp, written `3 Mar`. */
  date: IsoDate | Timestamp;
  /** The time zone a timestamp's day is read in. The browser's by default. */
  timeZone?: string | undefined;
  /** Adds the year to the date, for a list that spans more than one: `3 Mar 2026`. */
  year?: boolean | undefined;
} & Omit<ComponentProps<"time">, "dateTime" | "children">;

/** The row's day, in the first column. */
export function Day({ date, timeZone, year, className, ...props }: DayProps) {
  const language = useLanguage();

  return (
    <time
      {...props}
      dateTime={date}
      className={cn("text-xs text-secondary tabular-nums", className)}
    >
      {formatDate(date, language, { timeZone, year })}
    </time>
  );
}

/** The kind's icon in a soft circle. */
export function Marker({
  icon,
  className,
  ...props
}: { icon: IconProps["icon"] } & Omit<ComponentProps<"span">, "children">) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex size-[1.75rem] items-center justify-center rounded-full bg-highlight text-primary",
        className,
      )}
    >
      <Icon icon={icon} size="s" />
    </span>
  );
}

/** The column that holds the `Title` and, under it, the `Detail`. */
export function Text({ className, ...props }: ComponentProps<"span">) {
  return (
    <span {...props} className={cn("grid min-w-0 wrap-anywhere", className)} />
  );
}

/** What happened: “Bought 10 World Index ETF”. */
export function Title({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      {...props}
      className={cn("text-s font-semibold text-primary", className)}
    />
  );
}

/** The line under the title: the before → after, and who made it. */
export function Detail({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      {...props}
      className={cn("text-xs text-secondary tabular-nums", className)}
    />
  );
}

/** The ⋯ menu at the row's end: every prop of `Menu.MoreTrigger`, and its `Menu.Item`s as `children`. */
export function Actions({
  children,
  ...props
}: Menu.MoreTriggerProps & { children: ReactNode }) {
  return (
    <Menu.Root>
      <Menu.MoreTrigger {...props} />
      <Menu.Popup>{children}</Menu.Popup>
    </Menu.Root>
  );
}
