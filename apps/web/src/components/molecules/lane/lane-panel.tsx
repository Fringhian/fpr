import { Collapsible } from "@base-ui/react/collapsible";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn, stateClassName } from "../../../lib/cn";
import { Chip } from "../../atoms/chip/chip";
import type { LaneBest } from "./lane-name";

export type PanelProps = {
  /** The member's best share, shown first on phone, where the row leaves it out. */
  best?: LaneBest | null | undefined;
} & Omit<ComponentProps<typeof Collapsible.Panel>, "best">;

/** The best share with its gain, on phone only, where the row leaves it out. */
function PhoneBest({ best }: { best: LaneBest }) {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        "items-center gap-s text-xs text-secondary",
        "flex",
        "tablet:hidden",
        "desktop:hidden",
      )}
    >
      <span>{t("lane.bestShare")}</span>
      <Chip gain={best.percent ?? undefined}>{best.share}</Chip>
    </span>
  );
}

/**
 * What the opened lane shows under its row: the best share on phone, then
 * `children` at every width. Its height eases open and shut, clipped below
 * only, so a focus ring inside still shows at the top. With nothing but the
 * best share, it opens on phone only.
 */
export function Panel({
  best = null,
  children,
  className,
  ...props
}: PanelProps) {
  return (
    <Collapsible.Panel
      {...props}
      className={stateClassName(
        cn(
          "h-(--collapsible-panel-height) transition-[height] duration-m ease-soft [clip-path:inset(-0.25rem_-0.25rem_0_-0.25rem)]",
          "",
          children ? "" : "tablet:hidden",
          children ? "" : "desktop:hidden",
          "starting-style:h-0",
          "ending-style:h-0",
          "motion-reduce:transition-none",
        ),
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col items-start gap-s",
          "ps-[2.875rem] pe-s pb-m",
          "tablet:ps-[3.375rem] tablet:pe-[0.75rem] tablet:pb-m",
          "desktop:ps-[3.375rem] desktop:pe-[0.75rem] desktop:pb-m",
        )}
      >
        {best ? <PhoneBest best={best} /> : null}
        {children}
      </div>
    </Collapsible.Panel>
  );
}
