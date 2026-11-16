import type { Id } from "@fpr/contracts";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import type { Look } from "../../../lib/look";
import { Picture } from "../../atoms/picture/picture";

export type PictureStackProps = {
  /** The people, in the order they show, each named by their picture for screen readers. */
  people: readonly (Look & { id: Id })[];
  /** How many places the row has: past it, the last one counts the others, “+2”. */
  max?: number | undefined;
  /** Names the group for screen readers: “Who holds it”. */
  label: string;
} & Omit<ComponentProps<"ul">, "children">;

const place = "flex rounded-full -ms-[0.375rem] outline-2 outline-surface";

/**
 * A few people's small pictures, overlapping in a row, such as a share's
 * holders on its card: up to `max`, the last place counting the others when
 * there are more. A list named by `label`, each picture named by its person.
 */
export function PictureStack({
  people,
  max = 5,
  label,
  className,
  ...props
}: PictureStackProps) {
  const { t } = useTranslation();

  const shown = people.length > max ? people.slice(0, max - 1) : people;
  const others = people.length - shown.length;

  return (
    <ul
      aria-label={label}
      {...props}
      className={cn(
        "m-0 flex list-none items-center p-0 ps-[0.375rem]",
        className,
      )}
    >
      {shown.map(({ id, ...look }) => (
        <li key={id} className={place}>
          <Picture {...look} size="xs" />
        </li>
      ))}
      {others > 0 ? (
        <li
          className={cn(
            place,
            "size-[1.25rem] items-center justify-center bg-highlight text-[0.5rem] font-semibold text-secondary tabular-nums",
          )}
        >
          <span aria-hidden="true">+{others}</span>
          <span className="sr-only">
            {t("pictureStack.others", { count: others })}
          </span>
        </li>
      ) : null}
    </ul>
  );
}
