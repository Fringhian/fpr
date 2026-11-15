import { Input as BaseInput } from "@base-ui/react/input";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react/lib";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Icon } from "./icon";

interface InputOwnProps {
  /** An icon at the start, such as the magnifying glass of a search. */
  icon?: PhosphorIcon | undefined;
  /** A short control at the end: Show on a password, All on a quantity, clear on a search. */
  end?: ReactNode;
  /** A decimal number: phones open their decimal keyboard, and the figures line up. */
  decimal?: boolean | undefined;
  /** Marks the value wrong: a red outline, and `aria-invalid` on the input. Inside a Base UI `Field`, its validation sets it too. */
  invalid?: boolean | undefined;
  /** Classes for the outlined box, such as its width. */
  className?: string | undefined;
}

export type InputProps = InputOwnProps &
  Omit<BaseInput.Props, keyof InputOwnProps | "render" | "inputMode">;

/**
 * Text entry: 44 px tall, 16 px text, 12 px corners, with an optional icon
 * at the start and a control at the end. Every other prop goes to the
 * `<input>`, which is Base UI's, so it works inside a Base UI `Field`.
 */
export function Input({
  icon,
  end,
  decimal = false,
  invalid = false,
  className,
  ...props
}: InputProps) {
  return (
    <div
      className={cn(
        "flex min-h-[2.75rem] w-full items-center gap-s rounded-s bg-surface px-[0.875rem] text-m text-secondary inset-ring-[1.5px] inset-ring-divider",
        "",
        "",
        "",
        "focus-within:inset-ring-primary",
        "has-invalid:inset-ring-error",
        "has-disabled:bg-page has-disabled:text-secondary/55",
        className,
      )}
    >
      {icon ? <Icon icon={icon} size="s" /> : null}
      <BaseInput
        aria-invalid={invalid || undefined}
        inputMode={decimal ? "decimal" : undefined}
        {...props}
        className={cn(
          "min-w-0 flex-1 self-stretch bg-transparent text-primary outline-none placeholder:text-secondary",
          "",
          "",
          "",
          "disabled:text-secondary/55 disabled:placeholder:text-secondary/55",
          decimal ? "tabular-nums" : null,
        )}
      />
      {end ? (
        <span className="flex shrink-0 items-center text-s font-semibold">
          {end}
        </span>
      ) : null}
    </div>
  );
}
