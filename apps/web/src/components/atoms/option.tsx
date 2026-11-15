import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { type ReactNode, useId } from "react";
import { cn } from "../../lib/cn";
import { Icon, type IconProps } from "./icon";

/** Every prop of Base UI’s radio group, `className` included: a string, or a function of the group’s state. */
export type GroupProps<Value> = RadioGroup.Props<Value>;

/**
 * The answers to one question, on Base UI’s radio group: one tab stop, the
 * arrow keys move between the options and select the one they reach. Name it
 * after its question: `aria-labelledby` the step’s heading.
 */
export function Group<Value>({ className, ...props }: GroupProps<Value>) {
  return (
    <RadioGroup<Value>
      {...props}
      className={(state) =>
        cn(
          "grid gap-s",
          typeof className === "function" ? className(state) : className,
        )
      }
    />
  );
}

const item = cn(
  "flex w-full cursor-pointer items-center gap-[0.75rem] rounded-[1.125rem] bg-surface p-[0.875rem] text-left shadow-[inset_0_0_0_1.5px_var(--color-divider)]",
  "",
  "",
  "",
  "not-disabled:hover:bg-highlight",
  "focus-visible:focus-ring",
  "checked:shadow-[inset_0_0_0_2.5px_var(--color-primary)]",
  "disabled:cursor-not-allowed disabled:opacity-[0.45]",
);

export interface ItemOwnProps<Value> {
  /** The answer this option stands for, given to the group’s `onValueChange`. */
  value: Value;
  /** The answer’s icon, any Phosphor icon: `icon={PlusIcon}`. */
  icon: IconProps["icon"];
  /** The answer, short: “Bought shares”. It names the option for screen readers. */
  title: ReactNode;
  /** One line under the title that says what the answer covers: “Part or all of a holding”. */
  description: ReactNode;
}

/**
 * The option’s own props, then every prop of Base UI’s radio but `children`,
 * `render` and `nativeButton`: it draws its own content. `className` is a
 * string, or a function of the radio’s state.
 */
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

  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  return (
    <Radio.Root<Value>
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      {...props}
      className={(state) =>
        cn(item, typeof className === "function" ? className(state) : className)
      }
    >
      <Icon icon={icon} size="l" className="text-secondary" />
      <span className="flex min-w-0 flex-col">
        <span id={titleId} className="text-m font-semibold text-primary">
          {title}
        </span>
        <span id={descriptionId} className="text-xs text-secondary">
          {description}
        </span>
      </span>
    </Radio.Root>
  );
}
