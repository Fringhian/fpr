import type { IsoDate } from "@fpr/contracts";
import { CalendarBlankIcon } from "@phosphor-icons/react/CalendarBlank";
import { type ComponentProps, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { useDayText } from "../../../lib/day-text";
import { inputBox } from "../../atoms/input/input";
import { Icon } from "../../foundations/icon/icon";
import { Calendar } from "../calendar/calendar";
import * as Popover from "../popover/popover";

export type DayFieldProps = {
  /** The label above the field: “On”. */
  label: string;
  /** The day picked. */
  value: IsoDate;
  onValueChange: (day: IsoDate) => void;
  /** The last day that can be picked, such as today. */
  max: IsoDate;
  /** Today, which the field names “Today” when it is picked. */
  today?: IsoDate | undefined;
} & Omit<ComponentProps<"div">, "children" | "onChange" | "defaultValue">;

/**
 * A day in a form: its label, then a field showing the day picked, which
 * opens the calendar beside it, or as a sheet on phone. Picking a day closes
 * it. The days after `max` can't be picked.
 */
export function DayField({
  label,
  value,
  onValueChange,
  max,
  today,
  className,
  ...props
}: DayFieldProps) {
  const { t } = useTranslation();
  const dayText = useDayText(today);
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const valueId = useId();

  const shown = dayText(value);

  return (
    <div {...props} className={cn("flex w-full flex-col", className)}>
      <span id={labelId} className="mb-[0.375rem] text-s font-medium">
        {label}
      </span>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          aria-labelledby={`${labelId} ${valueId}`}
          className={cn(
            inputBox,
            "cursor-pointer text-left",
            "",
            "",
            "",
            "focus-visible:inset-shadow-primary",
          )}
        >
          <Icon icon={CalendarBlankIcon} size="s" />
          <span id={valueId} className="flex-1 text-primary">
            {shown}
          </span>
        </Popover.Trigger>
        <Popover.Popup
          align="start"
          className={cn("", "", "tablet:w-[21rem]", "desktop:w-[21rem]")}
        >
          <Popover.Title className="mb-s">{t("dayField.pick")}</Popover.Title>
          <Calendar
            value={value}
            onValueChange={(day) => {
              onValueChange(day);
              setOpen(false);
            }}
            max={max}
            aria-label={t("dayField.pick")}
          />
        </Popover.Popup>
      </Popover.Root>
    </div>
  );
}
