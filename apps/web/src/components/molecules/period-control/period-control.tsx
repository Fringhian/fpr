import type { Period } from "@fpr/contracts";
import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../../lib/cn";
import type { GainUnit } from "../../../lib/gain";
import type * as Segment from "../../atoms/segment/segment";
import type { IconProps } from "../../foundations/icon/icon";
import { Segments } from "./period-control-segments";
import { PhoneSheet } from "./period-control-sheet";

/** The one setting every page shares: its period and its unit. */
export interface PeriodSetting {
  period: Period;
  unit: GainUnit;
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
  /** From tablet up, after the € / % capsules: an ⓘ that explains them. */
  unitInfo?: ReactNode;
  /** On phone, under the rows of the sheet, where an ⓘ would open a second overlay: the same explanation written out. */
  unitNote?: ReactNode;
} & Omit<
  ComponentProps<"div">,
  "value" | "onChange" | "anonymous" | "icon" | "backdrop"
>;

/**
 * The shared period and € / %, on the sky or on snow. From tablet up, the period
 * capsules and the € / % capsules in a row; on phone, one capsule naming
 * both (“This month · %”) that opens a sheet holding the two rows. CSS picks
 * the layout. Controlled: the owner keeps the setting. An anonymous viewer
 * gets the period alone, in %, and no explanation of the units.
 */
export function PeriodControl({
  value,
  onChange,
  anonymous = false,
  icon = CaretDownIcon,
  backdrop = "sky",
  unitInfo,
  unitNote,
  className,
  ...props
}: PeriodControlProps) {
  const setting: PeriodSetting = anonymous
    ? { ...value, unit: "percent" }
    : value;

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
        {anonymous ? null : unitInfo}
      </div>
      <PhoneSheet
        setting={setting}
        anonymous={anonymous}
        backdrop={backdrop}
        icon={icon}
        note={anonymous ? undefined : unitNote}
        onChange={onChange}
      />
    </div>
  );
}
