import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import * as Segment from "../../atoms/segment/segment";
import { Icon, type IconProps } from "../../foundations/icon/icon";
import * as Dialog from "../dialog/dialog";

/** The spans a gain is measured over, as the API names them. */
export const periods = ["1D", "1W", "1M", "3M", "YTD", "all"] as const;

export type Period = (typeof periods)[number];

/** How a gain is expressed, as the API names it: in euros or in percent. */
export const units = ["eur", "percent"] as const;

export type Unit = (typeof units)[number];

/** The one setting every page shares: its period and its unit. */
export interface PeriodSetting {
  period: Period;
  unit: Unit;
}

/** Each unit's key under `controls.unit`. */
const UNIT_KEYS = {
  eur: "euro",
  percent: "percent",
} as const satisfies Record<Unit, string>;

interface SegmentsProps {
  setting: PeriodSetting;
  anonymous: boolean;
  backdrop: Segment.Backdrop;
  onChange: (setting: PeriodSetting) => void;
  className?: string;
}

/** The period capsules, then the € / % capsules unless the viewer is anonymous. */
function Segments({
  setting,
  anonymous,
  backdrop,
  onChange,
  className = "",
}: SegmentsProps) {
  const { t } = useTranslation();

  return (
    <>
      <Segment.Root<Period>
        backdrop={backdrop}
        value={setting.period}
        onValueChange={(period) => onChange({ ...setting, period })}
        aria-label={t("controls.period.label")}
        className={className}
      >
        {periods.map((period) => (
          <Segment.Item key={period} value={period}>
            {t(`controls.period.${period}`)}
          </Segment.Item>
        ))}
      </Segment.Root>
      {anonymous ? null : (
        <Segment.Root<Unit>
          backdrop={backdrop}
          value={setting.unit}
          onValueChange={(unit) => onChange({ ...setting, unit })}
          aria-label={t("controls.unit.label")}
          className={className}
        >
          {units.map((unit) => (
            <Segment.Item key={unit} value={unit}>
              {t(`controls.unit.${UNIT_KEYS[unit]}`)}
            </Segment.Item>
          ))}
        </Segment.Root>
      )}
    </>
  );
}

export type PeriodControlProps = {
  /** The period and unit shown, held by the owner. Pair it with `onChange`. */
  value: PeriodSetting;
  /** Called with the whole new setting when the person picks a period or a unit. */
  onChange: (value: PeriodSetting) => void;
  /** An anonymous viewer sees amounts in % only: the € / % capsules are hidden, the phone capsule names the period alone, and `onChange` always sends `unit: "percent"`. */
  anonymous?: boolean;
  /** The icon at the end of the phone capsule, which opens the sheet. A caret by default. */
  icon?: IconProps["icon"] | undefined;
  /** What the control sits on: the sky, by default, or snow on a page without a header sentence. */
  backdrop?: Segment.Backdrop;
} & Omit<
  ComponentProps<"div">,
  "value" | "onChange" | "anonymous" | "icon" | "backdrop"
>;

/** Hovered or open, the phone capsule's fill goes opaque; at rest it is `Segment.backdropFill`. */
const CAPSULE_ACTIVE = {
  sky: ["hover:bg-surface", "popup-open:bg-surface"],
  snow: ["hover:bg-divider", "popup-open:bg-divider"],
} as const satisfies Record<Segment.Backdrop, readonly string[]>;

/**
 * The shared period and € / %, on the sky or on snow. From tablet up, the period
 * capsules and the € / % capsules in a row; on phone, one capsule naming
 * both (“This month · %”) that opens a sheet holding the two rows. CSS picks
 * the layout. Controlled: the owner keeps the setting. An anonymous viewer
 * gets the period alone, in %.
 */
export function PeriodControl({
  value,
  onChange,
  anonymous = false,
  icon = CaretDownIcon,
  backdrop = "sky",
  className,
  ...props
}: PeriodControlProps) {
  const { t } = useTranslation();

  const setting: PeriodSetting = anonymous
    ? { ...value, unit: "percent" }
    : value;
  const period = t(`periodControl.period.${setting.period}`);
  const summary = anonymous
    ? period
    : t("periodControl.summary", {
        period,
        unit: t(`controls.unit.${UNIT_KEYS[setting.unit]}`),
      });

  return (
    <div {...props} className={cn("flex items-center", className)}>
      <div
        className={cn(
          "items-center gap-s",
          "hidden",
          "tablet:flex",
          "desktop:flex",
        )}
      >
        <Segments
          setting={setting}
          anonymous={anonymous}
          backdrop={backdrop}
          onChange={onChange}
        />
      </div>
      <Dialog.Root>
        <Dialog.Trigger
          className={cn(
            "cursor-pointer items-center gap-xs whitespace-nowrap rounded-full py-s pr-[0.625rem] pl-[0.75rem] text-s font-semibold text-primary",
            "inline-flex",
            "tablet:hidden",
            "desktop:hidden",
            "focus-visible:focus-ring",
            Segment.backdropFill[backdrop],
            CAPSULE_ACTIVE[backdrop],
          )}
        >
          {summary}
          {icon ? <Icon icon={icon} size="s" /> : null}
        </Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Header>
            <Dialog.Title>{t("periodControl.title")}</Dialog.Title>
            <Dialog.Close />
          </Dialog.Header>
          <Segments
            setting={setting}
            anonymous={anonymous}
            backdrop="snow"
            onChange={onChange}
            className="self-start"
          />
        </Dialog.Popup>
      </Dialog.Root>
    </div>
  );
}
