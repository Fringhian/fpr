import type { ReactNode } from "react";
import * as Dialog from "../../../../components/molecules/dialog/dialog";

/** An admin dialog's title row: the title, then the close button. */
export function DialogHeading({ children }: { children: ReactNode }) {
  return (
    <Dialog.Header>
      <Dialog.Title>{children}</Dialog.Title>
      <Dialog.Close />
    </Dialog.Header>
  );
}
