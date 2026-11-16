import type { IsoDate } from "@fpr/contracts";
import { CaretLeftIcon } from "@phosphor-icons/react/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import { type ComponentProps, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { useLanguage } from "../../../lib/i18n";
import { IconButton } from "../../atoms/icon-button/icon-button";
import { addMonths, monthName, monthOf } from "./calendar-model";
import { MonthGrid } from "./month-grid";

export type CalendarProps = {
  /** The day picked. */
  value: IsoDate;
  onValueChange: (day: IsoDate) => void;
  /** The last day that can be picked, such as today: the days after it are disabled, and so are the months after its. */
  max: IsoDate;
} & Omit<ComponentProps<"fieldset">, "onChange" | "defaultValue">;

/** The month shown: `value`'s at first, and again whenever `value` changes from outside. */
function useShownMonth(value: IsoDate) {
  const [shown, setShown] = useState(() => ({ value, month: monthOf(value) }));

  if (shown.value !== value) {
    setShown({ value, month: monthOf(value) });
  }
  return [shown.month, (month: IsoDate) => setShown({ value, month })] as const;
}

/**
 * A month of days to pick one from, Monday first: the month's name with the
 * months before and after, then its weeks. The day picked is in charcoal;
 * the days after `max` are disabled. One tab stop: the arrow keys move a day
 * or a week, Home and End to the month's ends, Page Up and Page Down a
 * month, and Enter or Space picks the day. A fieldset: name it with
 * `aria-label`, such as “Pick a day”.
 */
export function Calendar({
  value,
  onValueChange,
  max,
  className,
  ...props
}: CalendarProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const [month, setMonth] = useShownMonth(value);

  const latest = month >= monthOf(max);

  return (
    <fieldset
      {...props}
      className={cn("m-0 grid min-w-0 gap-xs border-0 p-0", className)}
    >
      <div className="flex items-center gap-xs">
        <p
          aria-live="polite"
          className="flex-1 text-m font-semibold first-letter:uppercase"
        >
          {monthName(month, language)}
        </p>
        <IconButton
          icon={CaretLeftIcon}
          label={t("calendar.previousMonth")}
          onClick={() => setMonth(addMonths(month, -1))}
        />
        <IconButton
          icon={CaretRightIcon}
          label={t("calendar.nextMonth")}
          disabled={latest}
          onClick={() => setMonth(addMonths(month, 1))}
        />
      </div>
      <MonthGrid
        month={month}
        value={value}
        max={max}
        onMonthChange={setMonth}
        onValueChange={onValueChange}
      />
    </fieldset>
  );
}
