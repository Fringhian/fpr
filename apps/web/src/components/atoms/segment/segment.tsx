import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { cva } from "class-variance-authority";
import { type RefAttributes, useState } from "react";
import { cn, stateClassName } from "../../../lib/cn";

/** What the segment sits on: `sky` for the peach sky, `snow` for the page or a white surface. */
export type Backdrop = "sky" | "snow";

/**
 * The capsule's resting fill on each backdrop: white veiling the sky, the
 * divider tint on snow. Any capsule that sits beside a segment takes it.
 */
export const backdropFill = {
  sky: "bg-surface/75",
  snow: "bg-divider/50",
} as const satisfies Record<Backdrop, string>;

const root = cva(
  ["inline-flex gap-[0.125rem] rounded-full p-[0.1875rem]", "", "", ""],
  {
    variants: {
      backdrop: {
        sky: [backdropFill.sky],
        snow: [backdropFill.snow],
      },
    },
  },
);

const item = cn(
  "cursor-pointer select-none whitespace-nowrap rounded-full bg-transparent px-[0.625rem] py-xs text-s font-semibold text-secondary",
  "",
  "",
  "",
  "hover:not-pressed:not-disabled:text-primary",
  "pressed:bg-primary pressed:text-on-primary",
  "focus-visible:focus-ring",
  "disabled:dimmed",
);

// The selected option, held either by the segment or by its owner.
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

/** Every prop of Base UI's ToggleGroup but `multiple`: a segment selects one option. */
export type RootProps<Value extends string> = Selection<Value> & {
  /** `sky` for the peach sky, `snow` for the page or a white surface. */
  backdrop: Backdrop;
  /** Called with the newly selected option. Pressing the selected one again changes nothing. */
  onValueChange?: (
    value: Value,
    eventDetails: ToggleGroup.ChangeEventDetails,
  ) => void;
} & Omit<
    ToggleGroup.Props<Value>,
    "value" | "defaultValue" | "onValueChange" | "multiple"
  > &
  RefAttributes<HTMLDivElement>;

/**
 * A row of capsules, one of them selected in charcoal: a Base UI ToggleGroup
 * holding one value. One option is always selected; the arrow keys move
 * between the options, and Space or Enter selects one. Name it with
 * `aria-label`. Every other prop goes to the ToggleGroup, `className`
 * included: a string, or a function of the group's state.
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
  const pressed = selected === undefined ? [] : [selected];

  return (
    <ToggleGroup<Value>
      {...props}
      value={pressed}
      onValueChange={(group, eventDetails) => {
        const [next] = group;
        // Pressing the selected capsule again would leave none selected.
        if (next === undefined) {
          return;
        }
        setHeld(next);
        onValueChange?.(next, eventDetails);
      }}
      className={stateClassName(root({ backdrop }), className)}
    />
  );
}

/** Every prop of Base UI's Toggle but its pressed state, which the segment holds. */
export type ItemProps<Value extends string> = {
  /** The option's value, unique within its segment. */
  value: Value;
} & Omit<
  Toggle.Props<Value>,
  "value" | "pressed" | "defaultPressed" | "onPressedChange"
> &
  RefAttributes<HTMLButtonElement>;

/**
 * One capsule: grey text at rest, charcoal with white text when selected.
 * Every other prop goes to Base UI's Toggle, `className` included: a string,
 * or a function of the toggle's state.
 */
export function Item<Value extends string>({
  className,
  ...props
}: ItemProps<Value>) {
  return (
    <Toggle<Value> {...props} className={stateClassName(item, className)} />
  );
}
