import { type ComponentProps, type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { Card } from "../../atoms/card/card";

export type ChangeSummaryProps = {
  /** The card's small title: “This change”. */
  title: ReactNode;
  /** One row per answer, in the flow's order: its term and its value, or `null` while it isn't chosen yet, drawn as a dash. */
  rows: readonly { term: string; value: ReactNode | null }[];
} & Omit<ComponentProps<"section">, "title">;

/**
 * What a flow knows so far, on a white card: Record a change's sky panel,
 * “What: Bought, Share: World Index ETF, When: 3 March, How many: –”. A
 * value not chosen yet is a dash, which screen readers hear as “not chosen
 * yet”.
 */
export function ChangeSummary({
  title,
  rows,
  className,
  ...props
}: ChangeSummaryProps) {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <Card
      aria-labelledby={titleId}
      {...props}
      elevation="rest"
      render={<section />}
      className={cn("w-full max-w-[26.25rem] p-m", className)}
    >
      <h2 id={titleId} className="text-s font-medium text-secondary">
        {title}
      </h2>
      <dl className="divide-y divide-divider">
        {rows.map(({ term, value }) => (
          <div
            key={term}
            className="flex items-baseline justify-between gap-m py-s"
          >
            <dt className="text-s text-secondary">{term}</dt>
            <dd className="min-w-0 text-right text-m font-semibold">
              {value ?? (
                <>
                  <span aria-hidden="true">–</span>
                  <span className="sr-only">{t("changeSummary.notYet")}</span>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
