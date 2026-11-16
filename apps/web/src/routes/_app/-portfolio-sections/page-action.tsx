import {
  Button,
  type ButtonProps,
} from "../../../components/atoms/button/button";
import { cn, stateClassName } from "../../../lib/cn";

/** A page's action as a link in the header on the sky, from tablet up: Portfolio's and a member's page's. */
export function HeaderAction({ className, ...props }: ButtonProps) {
  return (
    <Button
      nativeButton={false}
      {...props}
      className={stateClassName(
        cn("shrink-0", "hidden", "tablet:inline-grid", "desktop:inline-grid"),
        className,
      )}
    />
  );
}

/** The same action on phone, at full width under the page's first card. */
export function PhoneAction({ className, ...props }: ButtonProps) {
  return (
    <Button
      nativeButton={false}
      size="wide"
      {...props}
      className={stateClassName(
        cn("", "inline-grid", "tablet:hidden", "desktop:hidden"),
        className,
      )}
    />
  );
}
