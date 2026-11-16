import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { formatList } from "../../../lib/format/text";
import { useLanguage } from "../../../lib/i18n";

/** The line writes its own words, so it takes no `children`. */
export type LaneNotStartedProps = {
  /** The names of the members with no entry yet. Renders nothing when empty. */
  names: readonly string[];
} & Omit<ComponentProps<"p">, "names" | "children">;

/**
 * The members who haven't started, in one line under the lanes: “Kim and Lea
 * haven’t started yet.” Every other prop goes to the `<p>`, `className`
 * included.
 */
export function LaneNotStarted({
  names,
  className,
  ...props
}: LaneNotStartedProps) {
  const { t } = useTranslation();
  const language = useLanguage();

  const sentence = t("lane.notStarted", {
    count: names.length,
    names: formatList(names, language),
  });

  return names.length === 0 ? null : (
    <p
      {...props}
      className={cn(
        "pt-s text-s text-secondary",
        "px-s",
        "tablet:px-[0.75rem]",
        "desktop:px-[0.75rem]",
        className,
      )}
    >
      {sentence}
    </p>
  );
}
