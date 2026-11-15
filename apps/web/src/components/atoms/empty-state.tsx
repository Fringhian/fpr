import { useRender } from "@base-ui/react/use-render";
import { TrayIcon } from "@phosphor-icons/react/Tray";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { StateIcon, type StateIconProps } from "./state-icon";

/** Every prop of a `<div>`. */
export type RootProps = ComponentProps<"div">;

/** The empty state’s column, centred in its container. */
export function Root({ className, ...props }: RootProps) {
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

export interface IconOwnProps {
  /** The state’s icon, any Phosphor icon. The tray by default, for nothing there yet; a plus when the action adds the first one. */
  icon?: StateIconProps["icon"] | undefined;
}

/** The icon’s own props, then every prop of the state icon but `size`: an empty state’s is 56 px. */
export type IconProps = IconOwnProps &
  Omit<StateIconProps, keyof IconOwnProps | "size">;

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

/** Every prop of an `<h2>`, and Base UI's `render` to give another heading level. */
export type TitleProps = useRender.ComponentProps<"h2">;

/**
 * What is empty: “Your portfolio is empty”. Renders an `<h2>`; `render` gives
 * another level, such as the page’s `<h1>`: `render={<h1 />}`.
 */
export function Title({ render, ref, className, ...props }: TitleProps) {
  const element = useRender({
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

  return element;
}

/** Every prop of a `<p>`. */
export type DescriptionProps = ComponentProps<"p">;

/** One sentence that says what to do: “Record each share you hold with the day you bought it.” */
export function Description({ className, ...props }: DescriptionProps) {
  return <p {...props} className={cn("text-m text-secondary", className)} />;
}

/** Every prop of a `<div>`. */
export type ActionProps = ComponentProps<"div">;

/** Holds the action that fills the state: a `Button` or a `TextLink`. */
export function Action({ className, ...props }: ActionProps) {
  return (
    <div
      {...props}
      className={cn("mt-s flex flex-wrap justify-center gap-s", className)}
    />
  );
}
