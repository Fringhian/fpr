import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { cva, type VariantProps } from "class-variance-authority";
import { useState } from "react";
import { cn } from "../../lib/cn";

const root = cva(
  ["inline-flex gap-[0.125rem] rounded-full p-[0.1875rem]", "", "", ""],
  {
    variants: {
      backdrop: {
        sky: ["bg-surface/75"],
        snow: ["bg-divider/50"],
      },
    },
  },
);

/** What the segment sits on: `sky` for the peach sky, `snow` for the page or a white surface. */
export type Backdrop = NonNullable<VariantProps<typeof root>["backdrop"]>;

/** The selected option, either held by the segment or by its owner. */
type Selection<Value extends string> =
  | {
      /** The selected option, held by the owner. Pair it with `onValueChange`. */
      value: Value;
      defaultValue?: never;
    }
  | {
      value?: never;
      /** The option selected at first, then held by the segment. */
      defaultValue: Value;
    };

/** ToggleGroup's props that the segment sets itself or narrows to one value. */
type ReplacedProps =
  | "value"
  | "defaultValue"
  | "onValueChange"
  | "multiple"
  | "orientation"
  | "className";

export type RootProps<Value extends string> = Omit<
  ToggleGroup.Props<Value>,
  ReplacedProps
> &
  Selection<Value> & {
    /** `sky` for the peach sky, `snow` for the page or a white surface. */
    backdrop: Backdrop;
    /** Called with the newly selected option. Pressing the selected one again changes nothing. */
    onValueChange?: (
      value: Value,
      eventDetails: ToggleGroup.ChangeEventDetails,
    ) => void;
    className?: string;
  };

/**
 * A row of capsules, one of them selected in charcoal: a Base UI ToggleGroup
 * holding one value. One option is always selected; the arrow keys move
 * between the options, and Space or Enter selects one. Name it with
 * `aria-label`.
 */
export function Root<Value extends string>({
  value,
  defaultValue,
  onValueChange,
  backdrop,
  className,
  ...props
}: RootProps<Value>) {
  const [held, setHeld] = useState(defaultValue);
  const selected = value ?? held;
  return (
    <ToggleGroup<Value>
      {...props}
      value={selected === undefined ? [] : [selected]}
      onValueChange={(group, eventDetails) => {
        const [next] = group;
        // Pressing the selected capsule again would leave none selected.
        if (next === undefined) {
          return;
        }
        setHeld(next);
        onValueChange?.(next, eventDetails);
      }}
      className={cn(root({ backdrop }), className)}
    />
  );
}

export type ItemProps<Value extends string> = Omit<
  Toggle.Props<Value>,
  "value" | "pressed" | "defaultPressed" | "onPressedChange" | "className"
> & {
  /** The option's value, unique within its segment. */
  value: Value;
  className?: string;
};

/** One capsule: grey text at rest, charcoal with white text when selected. */
export function Item<Value extends string>({
  className,
  ...props
}: ItemProps<Value>) {
  return (
    <Toggle<Value>
      {...props}
      className={cn(
        "cursor-pointer select-none whitespace-nowrap rounded-full bg-transparent px-[0.625rem] py-xs text-s font-semibold text-secondary",
        "",
        "",
        "",
        "hover:not-pressed:not-disabled:text-primary",
        "pressed:bg-primary pressed:text-on-primary",
        "focus-visible:focus-ring",
        "disabled:cursor-not-allowed disabled:opacity-[0.45]",
        className,
      )}
    />
  );
}
