import { useRender } from "@base-ui/react/use-render";
import { TrayIcon } from "@phosphor-icons/react/Tray";
import type { ComponentProps } from "react";
import { cn } from "../../../lib/cn";
import {
  StateIcon,
  type StateIconProps,
} from "../../atoms/state-icon/state-icon";

/** The empty state’s column, centred in its container. */
export function Root({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "mx-auto flex max-w-[20rem] flex-col items-center gap-s text-center",
        className,
      )}
    />
  );
}

/** The icon’s own props, then every prop of the state icon but `size`: an empty state’s is 56 px. */
export type IconProps = {
  /** The state’s icon, any Phosphor icon. The tray by default, for nothing there yet; a plus when the action adds the first one. */
  icon?: StateIconProps["icon"] | undefined;
} & Omit<StateIconProps, "icon" | "size">;

/** The icon in its soft blush circle, 56 px: the tray by default, a plus when the action adds the first one. */
export function Icon({ icon = TrayIcon, className, ...props }: IconProps) {
  return (
    <StateIcon
      {...props}
      icon={icon}
      size="l"
      className={cn("mb-s", className)}
    />
  );
}

/**
 * What is empty: “Your portfolio is empty”. Renders an `<h2>`; `render` gives
 * another level, such as the page’s `<h1>`: `render={<h1 />}`.
 */
export function Title({
  render,
  ref,
  className,
  ...props
}: useRender.ComponentProps<"h2">) {
  return useRender({
    render,
    ref,
    defaultTagName: "h2",
    props: {
      ...props,
      className: cn(
        "text-l font-semibold text-balance text-primary",
        className,
      ),
    },
  });
}

/** One sentence that says what to do: “Record each share you hold with the day you bought it.” */
export function Description({ className, ...props }: ComponentProps<"p">) {
  return <p {...props} className={cn("text-m text-secondary", className)} />;
}

/** Holds the action that fills the state: a `Button` or a `TextLink`. */
export function Action({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn("mt-s flex flex-wrap justify-center gap-s", className)}
    />
  );
}
