import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import type { Icon as PhosphorIconType } from "@phosphor-icons/react/lib";
import { type ReactNode, useId } from "react";
import { cn } from "../../lib/cn";
import { Icon } from "./icon";

export type GroupProps<Value> = Omit<RadioGroup.Props<Value>, "className"> & {
  /** Classes added to the group’s own, which win any conflict. */
  className?: string;
};

/**
 * The answers to one question, on Base UI’s radio group: one tab stop, the
 * arrow keys move between the options and select the one they reach. Name it
 * after its question: `aria-labelledby` the step’s heading.
 */
export function Group<Value>({ className, ...props }: GroupProps<Value>) {
  return (
    <RadioGroup<Value> {...props} className={cn("grid gap-s", className)} />
  );
}

interface ItemOwnProps<Value> {
  /** The answer this option stands for, given to the group’s `onValueChange`. */
  value: Value;
  /** A Phosphor icon, imported from its own module: `@phosphor-icons/react/Plus`. */
  icon: PhosphorIconType;
  /** The answer, short: “Bought shares”. It names the option for screen readers. */
  title: ReactNode;
  /** One line under the title that says what the answer covers: “Part or all of a holding”. */
  description: ReactNode;
  /** Classes added to the option’s own, which win any conflict. */
  className?: string;
}

export type ItemProps<Value> = ItemOwnProps<Value> &
  Omit<
    Radio.Root.Props<Value>,
    keyof ItemOwnProps<Value> | "children" | "render" | "nativeButton"
  >;

/** One answer: an icon, its title and one line, outlined in charcoal when selected. */
export function Item<Value>({
  icon,
  title,
  description,
  className,
  ...props
}: ItemProps<Value>) {
  const id = useId();
  return (
    <Radio.Root<Value>
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      {...props}
      className={cn(
        "flex w-full cursor-pointer items-center gap-[0.75rem] rounded-[1.125rem] bg-surface p-[0.875rem] text-left shadow-[inset_0_0_0_1.5px_var(--color-divider)]",
        "",
        "",
        "",
        "not-disabled:hover:bg-highlight",
        "focus-visible:focus-ring",
        "checked:shadow-[inset_0_0_0_2.5px_var(--color-primary)]",
        "disabled:cursor-not-allowed disabled:opacity-[0.45]",
        className,
      )}
    >
      <Icon icon={icon} size="l" className="text-secondary" />
      <span className="flex min-w-0 flex-col">
        <span id={`${id}-title`} className="text-m font-semibold text-primary">
          {title}
        </span>
        <span id={`${id}-description`} className="text-xs text-secondary">
          {description}
        </span>
      </span>
    </Radio.Root>
  );
}
