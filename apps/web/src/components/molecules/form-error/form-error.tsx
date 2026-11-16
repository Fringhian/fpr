import { WarningCircleIcon } from "@phosphor-icons/react/WarningCircle";
import type { ComponentProps } from "react";
import { cn } from "../../../lib/cn";
import { Icon } from "../../foundations/icon/icon";

export type FormErrorProps = {
  /** What went wrong and what to do next, or nothing while the form has no error. */
  children?: string | null | undefined;
} & Omit<ComponentProps<"p">, "children">;

/**
 * An answer that refuses the whole form rather than one field, such as too
 * many attempts or no connection, under the form's last field. It is an
 * alert, announced as it appears, and renders nothing without an error, so
 * it takes no room in the form until then.
 */
export function FormError({ children, className, ...props }: FormErrorProps) {
  return children ? (
    <p
      {...props}
      role="alert"
      className={cn("flex items-start gap-xs text-s text-error", className)}
    >
      <Icon icon={WarningCircleIcon} size="s" className="mt-[0.125rem]" />
      <span className="min-w-0">{children}</span>
    </p>
  ) : null;
}
