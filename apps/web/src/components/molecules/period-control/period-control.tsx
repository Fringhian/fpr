import type { Period } from "@fpr/contracts";
import { periods, units } from "@fpr/contracts/values";
import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import type { GainUnit } from "../../../lib/gain";
import * as Segment from "../../atoms/segment/segment";
import { Icon, type IconProps } from "../../foundations/icon/icon";
import * as Dialog from "../dialog/dialog";

/** The one setting every page shares: its period and its unit. */
export interface PeriodSetting {
  period: Period;
  unit: GainUnit;
}

/** Each unit's key under `controls.unit`. */
const UNIT_KEYS = {
  eur: "euro",
  percent: "percent",
} as const satisfies Record<GainUnit, string>;

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
        <Segment.Root<GainUnit>
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

interface PeriodControlOwnProps {
  /** The period and unit shown, held by the owner. Pair it with `onChange`. */
  value: PeriodSetting;
  /** Called with the whole new setting when the person picks a period or a unit. */
  onChange: (value: PeriodSetting) => void;
  /** An anonymous viewer sees amounts in % only: the € / % capsules are hidden, the phone capsule names the period alone, and `onChange` always sends `unit: "percent"`. */
  anonymous?: boolean;
  /** The icon at the end of the phone capsule, which opens the sheet. A caret by default. */
  icon?: IconProps["icon"] | undefined;
}

export type PeriodControlProps = PeriodControlOwnProps &
  Omit<ComponentProps<"div">, keyof PeriodControlOwnProps>;

/**
 * The shared period and € / %, on the sky. From tablet up, the period
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
          backdrop="sky"
          onChange={onChange}
        />
      </div>
      <Dialog.Root>
        <Dialog.Trigger
          className={cn(
            "cursor-pointer items-center gap-xs whitespace-nowrap rounded-full bg-surface/75 py-s pr-[0.625rem] pl-[0.75rem] text-s font-semibold text-primary",
            "inline-flex",
            "tablet:hidden",
            "desktop:hidden",
            "hover:bg-surface",
            "popup-open:bg-surface",
            "focus-visible:focus-ring",
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
