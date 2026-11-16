import type { ReactNode } from "react";

/**
 * The heading of a group of the admin area, “Members · 4”, with a line under
 * it when `description` says what the group is, and `end` at its right, such
 * as the group's add button. `id` names the group's section.
 */
export function GroupHeading({
  id,
  title,
  count,
  description,
  end,
}: {
  id: string;
  title: string;
  count: number;
  description?: string | undefined;
  end?: ReactNode;
}) {
  return (
    <div className="flex min-h-xl items-center justify-between gap-m">
      <div className="flex flex-col gap-xs">
        <h2 id={id} className="text-m font-semibold text-primary">
          {title} <span className="font-normal text-secondary">· {count}</span>
        </h2>
        {description === undefined ? null : (
          <p className="text-xs text-secondary">{description}</p>
        )}
      </div>
      {end}
    </div>
  );
}
