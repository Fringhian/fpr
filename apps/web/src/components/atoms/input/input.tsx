import { Input as BaseInput } from "@base-ui/react/input";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../../lib/cn";
import { Icon, type IconProps } from "../../foundations/icon/icon";

/** The outlined box an input sits in, for a control drawn as one, such as a day field's button. */
export const inputBox = cn(
  "flex min-h-[2.75rem] w-full items-center gap-s rounded-s bg-surface px-[0.875rem] text-m text-secondary inset-shadow-outline",
  "",
  "",
  "",
  "focus-within:inset-shadow-primary",
  "has-invalid:inset-shadow-error",
  "has-disabled:bg-page has-disabled:text-secondary/55",
);

const field = cn(
  "min-w-0 flex-1 self-stretch bg-transparent text-primary outline-none placeholder:text-secondary",
  "",
  "",
  "",
  "disabled:text-secondary/55 disabled:placeholder:text-secondary/55",
);

export type InputProps = {
  /** An icon at the start, any Phosphor icon: the search's `MagnifyingGlassIcon`. */
  icon?: IconProps["icon"] | undefined;
  /** A short control at the end: Show on a password, All on a quantity, clear on a search. */
  end?: ReactNode;
  /** A decimal number: phones open their decimal keyboard, and the figures line up. The input stays a text input, so a decimal comma is kept. */
  decimal?: boolean | undefined;
  /** Marks the value wrong: a red outline, and `aria-invalid` on the input. Inside a Base UI `Field`, its validation sets it too. */
  invalid?: boolean | undefined;
  /** Classes for the outlined box the input sits in, such as its width: the box is what this component renders around Base UI's input. */
  className?: ComponentProps<"div">["className"];
} & Omit<
  ComponentProps<typeof BaseInput>,
  "icon" | "end" | "decimal" | "invalid" | "className"
>;

/**
 * Text entry: 44 px tall, 16 px text, 12 px corners, with an optional icon
 * at the start and a control at the end. `className` styles the outlined
 * box; every other prop goes to Base UI's input, so it works inside a Base
 * UI `Field`.
 */
export function Input({
  icon,
  end,
  decimal = false,
  invalid = false,
  className,
  ...props
}: InputProps) {
  const fieldClasses = cn(field, decimal ? "tabular-nums" : null);

  return (
    <div className={cn(inputBox, className)}>
      {icon ? <Icon icon={icon} size="s" /> : null}
      <BaseInput
        aria-invalid={invalid || undefined}
        inputMode={decimal ? "decimal" : undefined}
        {...props}
        className={fieldClasses}
      />
      {end ? (
        <span className="flex shrink-0 items-center text-s font-semibold">
          {end}
        </span>
      ) : null}
    </div>
  );
}
