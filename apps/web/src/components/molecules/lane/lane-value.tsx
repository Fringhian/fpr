import type { ComponentProps } from "react";
import { barScale, type UnitScale } from "../../../lib/bar-track";
import { cn } from "../../../lib/cn";
import { formatMoney } from "../../../lib/format/money";
import { useLanguage } from "../../../lib/i18n";
import { type LaneValue, laneAmount } from "../../../lib/lane";
import type { MemberColor } from "../../../lib/member-color";
import { BarTrack, type BarTrackProps } from "../../atoms/bar-track/bar-track";
import { GainValue } from "../../atoms/gain-value/gain-value";

export type BarProps = {
  /** What the lane shows, as `LaneValue`: a gain in its unit, or a balance. */
  value: LaneValue;
  /** The standings' scale, from `laneScale`. Without it, the bar is measured against itself. */
  scale?: UnitScale | undefined;
  color: MemberColor;
} & Omit<BarTrackProps, "value" | "amount" | "scale" | "color" | "size">;

/** The bar of the lane's value, on the standings' scale of the unit it reads in, or on its own. */
export function Bar({ value, scale, color, ...props }: BarProps) {
  const shown = laneAmount(value);
  const amount = shown === null ? null : Number(shown.amount);
  const unit = shown?.unit ?? (value.board === "gain" ? value.unit : "eur");

  return (
    <BarTrack
      {...props}
      amount={amount}
      scale={scale?.[unit] ?? barScale([amount])}
      color={color}
      size="m"
    />
  );
}

/** The lane's value: the signed gain in its colour, or the balance in whole euros. */
export function Figure({
  value,
  className,
  ...props
}: { value: LaneValue } & Omit<ComponentProps<"span">, "children">) {
  const language = useLanguage();

  return (
    <span
      {...props}
      className={cn(
        "text-end",
        "text-s",
        "tablet:text-m",
        "desktop:text-m",
        className,
      )}
    >
      {value.board === "gain" ? (
        <GainValue
          gain={value.gain}
          unit={value.unit}
          precision="euros"
          className="whitespace-nowrap"
        />
      ) : value.balance === null ? null : (
        <span className="font-semibold whitespace-nowrap tabular-nums">
          {formatMoney(value.balance, language, { precision: "euros" })}
        </span>
      )}
    </span>
  );
}
