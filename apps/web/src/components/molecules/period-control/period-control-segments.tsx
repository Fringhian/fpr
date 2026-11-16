import type { Period } from "@fpr/contracts";
import { periods, units } from "@fpr/contracts/values";
import { useTranslation } from "react-i18next";
import type { GainUnit } from "../../../lib/gain";
import * as Segment from "../../atoms/segment/segment";
import type { PeriodSetting } from "./period-control";

/** Each unit's key under `controls.unit`. */
export const UNIT_KEYS = {
  eur: "euro",
  percent: "percent",
} as const satisfies Record<GainUnit, string>;

export interface SegmentsProps {
  setting: PeriodSetting;
  anonymous: boolean;
  backdrop: Segment.Backdrop;
  onChange: (setting: PeriodSetting) => void;
  className?: string;
}

/** The period capsules, then the € / % capsules unless the viewer is anonymous. */
export function Segments({
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
