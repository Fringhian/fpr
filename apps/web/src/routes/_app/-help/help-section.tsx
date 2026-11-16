import { ArrowsSplitIcon } from "@phosphor-icons/react/ArrowsSplit";
import { CalendarBlankIcon } from "@phosphor-icons/react/CalendarBlank";
import { ChartLineUpIcon } from "@phosphor-icons/react/ChartLineUp";
import { ClockIcon } from "@phosphor-icons/react/Clock";
import { CoinsIcon } from "@phosphor-icons/react/Coins";
import { HandCoinsIcon } from "@phosphor-icons/react/HandCoins";
import { HeartIcon } from "@phosphor-icons/react/Heart";
import { HourglassMediumIcon } from "@phosphor-icons/react/HourglassMedium";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { PencilSimpleIcon } from "@phosphor-icons/react/PencilSimple";
import { useTranslation } from "react-i18next";
import { StateIcon } from "../../../components/atoms/state-icon/state-icon";
import type { IconProps } from "../../../components/foundations/icon/icon";
import { cn } from "../../../lib/cn";
import type { HelpSection as Section } from "../../../lib/help-info";
import { Credits } from "./credits";

const ICONS = {
  race: ChartLineUpIcon,
  periods: CalendarBlankIcon,
  today: ClockIcon,
  record: PencilSimpleIcon,
  cash: CoinsIcon,
  search: MagnifyingGlassIcon,
  manual: HandCoinsIcon,
  missing: HourglassMediumIcon,
  splits: ArrowsSplitIcon,
  credits: HeartIcon,
} as const satisfies Record<Section, IconProps["icon"]>;

/**
 * One section of How FPR works, at its own address: its icon, its title and
 * its sentences. The section the address names is tinted.
 */
export function HelpSection({
  id,
  current,
}: {
  id: Section;
  current: boolean;
}) {
  const { t } = useTranslation();

  const titleId = `${id}-title`;

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn(
        "flex scroll-mt-m items-start rounded-card py-m transition-colors duration-m ease-soft motion-reduce:transition-none",
        "gap-[0.75rem] px-s",
        "tablet:gap-m tablet:px-m",
        "desktop:gap-m desktop:px-m",
        current ? "bg-highlight" : "bg-transparent",
      )}
    >
      <StateIcon
        icon={ICONS[id]}
        size="m"
        className={current ? "bg-surface" : undefined}
      />
      <div className="flex min-w-0 flex-col gap-xs pt-s">
        <h2 id={titleId} className="text-m font-semibold">
          {t(`helpPage.sections.${id}.title`)}
        </h2>
        <p className="max-w-[60ch] text-s text-secondary">
          {t(`helpPage.sections.${id}.body`)}
        </p>
        {id === "credits" ? <Credits /> : null}
      </div>
    </section>
  );
}
