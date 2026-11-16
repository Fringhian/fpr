import { type ComponentProps, type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { Card } from "../../atoms/card/card";
import { TextLink } from "../../atoms/text-link/text-link";

/** One thing done that can be undone. */
export type UndoItem = {
  id: string;
  /** What was done, short: “Bought 10 World Index ETF · 3 Mar”. */
  label: ReactNode;
  /** Already undone: “Undone” stands in place of Undo. */
  undone?: boolean | undefined;
  /** Its Undo is on its way: Undo waits. */
  busy?: boolean | undefined;
};

export type UndoListProps = {
  /** The list's small title: “This session”. */
  title: ReactNode;
  items: readonly UndoItem[];
  /** Called with an item's `id` when its Undo is pressed. */
  onUndo: (id: string) => void;
} & Omit<ComponentProps<"section">, "title">;

/**
 * What was just done, oldest first, each with Undo at its end: the changes
 * saved in one sitting of Record a change. An item undone says so in place
 * of Undo, so the list keeps its rows.
 */
export function UndoList({
  title,
  items,
  onUndo,
  className,
  ...props
}: UndoListProps) {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      {...props}
      className={cn("grid gap-s", className)}
    >
      <h2 id={titleId} className="text-s font-medium text-secondary">
        {title}
      </h2>
      <Card render={<ul />} className="divide-y divide-divider px-m">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-baseline justify-between gap-m py-s"
          >
            <span
              id={`${titleId}-${item.id}`}
              className={cn(
                "min-w-0 text-s",
                item.undone ? "text-secondary line-through" : null,
              )}
            >
              {item.label}
            </span>
            {item.undone ? (
              <span className="text-s text-secondary">
                {t("undoList.undone")}
              </span>
            ) : (
              <TextLink
                render={<button type="button" disabled={item.busy} />}
                aria-busy={item.busy || undefined}
                aria-describedby={`${titleId}-${item.id}`}
                onClick={() => onUndo(item.id)}
                className="cursor-pointer text-s"
              >
                {t("undoList.undo")}
              </TextLink>
            )}
          </li>
        ))}
      </Card>
    </section>
  );
}
