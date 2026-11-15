import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../../lib/cn";
import { type Decimal, formatPercent } from "../../../lib/format";
import { useLanguage } from "../../../lib/i18n";
import { MINUS } from "../../../lib/typography";

export interface ChipOwnProps {
  /** What the chip names: a share, a person, an ISIN. */
  children: ReactNode;
  /** The person's picture, at 20 px, before their name. */
  picture?: ReactNode;
  /**
   * A gain in percent, as the API sends it (`12.4`, `-1.3`), written after
   * the name with its sign, in green for a gain and red for a loss.
   */
  gain?: Decimal | undefined;
}

export type ChipProps = ChipOwnProps &
  Omit<ComponentProps<"span">, keyof ChipOwnProps>;

/** The gain's colour, read from the sign it is written with once rounded. */
function gainTone(text: string): string {
  if (text.startsWith("+")) {
    return "text-positive";
  }
  return text.startsWith(MINUS) ? "text-negative" : "text-secondary";
}

function ChipGain({ percent }: { percent: Decimal }) {
  const language = useLanguage();

  const text = formatPercent(percent, language, { signed: true });

  return <span className={cn("tabular-nums", gainTone(text))}>{text}</span>;
}

/**
 * A white capsule with an outline, for a share or a person mentioned in a
 * sentence: a share's name, optionally with its gain; a person's picture and
 * name; an ISIN. Every other prop goes to the `<span>`, `className` included.
 */
export function Chip({
  children,
  picture,
  gain,
  className,
  ...props
}: ChipProps) {
  const start = picture ? "pl-[0.1875rem]" : "pl-[0.6875rem]";

  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center gap-[0.375rem] rounded-full bg-surface py-[0.1875rem] pr-[0.6875rem] text-s font-semibold whitespace-nowrap text-primary shadow-outline",
        start,
        className,
      )}
    >
      {picture}
      {children}
      {gain === undefined ? null : <ChipGain percent={gain} />}
    </span>
  );
}
