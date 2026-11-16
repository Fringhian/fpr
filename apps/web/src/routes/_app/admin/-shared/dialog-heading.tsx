import type { ReactNode } from "react";
import * as Dialog from "../../../../components/molecules/dialog/dialog";

/**
 * An admin dialog's title row: the title, then the close button, disabled
 * while `locked`.
 */
export function DialogHeading({
  children,
  locked = false,
}: {
  children: ReactNode;
  locked?: boolean;
}) {
  return (
    <Dialog.Header>
      <Dialog.Title>{children}</Dialog.Title>
      <Dialog.Close disabled={locked} />
    </Dialog.Header>
  );
}
