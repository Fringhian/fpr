import type { IsoDate } from "@fpr/contracts";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { cn } from "../../../lib/cn";
import { formatDate } from "../../../lib/format/date";
import { useLanguage } from "../../../lib/i18n";
import { dayAfterKey, monthOf, monthWeeks, weekdays } from "./calendar-model";

const dayButton = cn(
  "inline-grid size-xl cursor-pointer place-items-center rounded-s bg-transparent text-s font-normal text-primary tabular-nums",
  "",
  "",
  "",
  "not-disabled:not-pressed:hover:bg-highlight",
  "pressed:bg-primary pressed:font-semibold pressed:text-on-primary",
  "focus-visible:focus-ring",
  "disabled:dimmed",
);

function useFocusedDay(value: IsoDate, max: IsoDate, month: IsoDate) {
  const [focused, setFocused] = useState(value);
  const table = useRef<HTMLTableElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    table.current
      ?.querySelector<HTMLButtonElement>(`[data-day="${focused}"]`)
      ?.focus();
  }, [focused]);

  // A disabled day can't take focus: past `max`, the tab stop is `max`.
  const latest = (day: IsoDate) => (day > max ? max : day);
  const picked = latest(value);
  const tabStop = latest(
    monthOf(focused) === month
      ? focused
      : monthOf(picked) === month
        ? picked
        : month,
  );
  return {
    table,
    tabStop,
    setFocused,
    moveTo: (day: IsoDate) => {
      moved.current = true;
      setFocused(day > max ? max : day);
    },
  };
}

/** The month's weeks under the weekdays' letters, each day a button. */
export function MonthGrid({
  month,
  value,
  max,
  onMonthChange,
  onValueChange,
}: {
  month: IsoDate;
  value: IsoDate;
  max: IsoDate;
  onMonthChange: (month: IsoDate) => void;
  onValueChange: (day: IsoDate) => void;
}) {
  const language = useLanguage();
  const { table, tabStop, setFocused, moveTo } = useFocusedDay(
    value,
    max,
    month,
  );

  const onKeyDown = (event: KeyboardEvent) => {
    const next = dayAfterKey(tabStop, event.key);
    if (next === null) return;
    event.preventDefault();
    const day = next > max ? max : next;
    moveTo(day);
    onMonthChange(monthOf(day));
  };

  return (
    <table
      ref={table}
      className="w-full table-fixed border-collapse"
      onKeyDown={onKeyDown}
    >
      <thead>
        <tr>
          {weekdays(language).map((weekday) => (
            <th
              key={weekday.long}
              abbr={weekday.long}
              scope="col"
              className="pb-xs text-xs font-medium text-secondary"
            >
              {weekday.short}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {monthWeeks(month).map((week) => (
          <tr key={week.find((day) => day !== null)}>
            {week.map((day, index) => (
              // A blank has no day to key it: its place in the week does.
              <td key={day ?? `blank-${index}`} className="p-0 text-center">
                {day === null ? null : (
                  <Day
                    day={day}
                    tabStop={day === tabStop}
                    picked={day === value}
                    disabled={day > max}
                    onFocus={() => setFocused(day)}
                    onClick={() => onValueChange(day)}
                  />
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** One day, named by its full date for screen readers. */
function Day({
  day,
  tabStop,
  picked,
  ...props
}: {
  day: IsoDate;
  tabStop: boolean;
  picked: boolean;
  disabled: boolean;
  onFocus: () => void;
  onClick: () => void;
}) {
  const language = useLanguage();

  return (
    <button
      {...props}
      type="button"
      data-day={day}
      tabIndex={tabStop ? 0 : -1}
      aria-pressed={picked}
      aria-label={formatDate(day, language, { style: "long", year: true })}
      className={dayButton}
    >
      {Number(day.slice(8))}
    </button>
  );
}
