import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { Icon } from "../../components/foundations/icon/icon";
import { cn } from "../../lib/cn";

/** A full-width row of Settings under a divider, its name then an icon at its end: Change password, How FPR works. */
export const settingRow = cn(
  "flex min-h-[3rem] w-full cursor-pointer items-center justify-between gap-s border-t-[1.5px] border-divider bg-transparent text-start text-s font-semibold text-primary no-underline",
  "",
  "",
  "",
  "hover:underline",
  "focus-visible:focus-ring",
);

/** The caret at the end of a row that opens in place, turned up while open. */
export function RowCaret({ open }: { open: boolean }) {
  return (
    <Icon
      icon={CaretDownIcon}
      size="s"
      className={cn(
        "text-secondary transition-transform duration-s ease-soft motion-reduce:transition-none",
        open ? "rotate-180" : "rotate-0",
      )}
    />
  );
}
