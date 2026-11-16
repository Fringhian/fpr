import { useCallback, useMemo, useState } from "react";

/** A dialog root's controlled props, which a `Dialog.Root` or a `ConfirmDialog.Root` takes. */
export type DialogRootState = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChangeComplete: (open: boolean) => void;
};

/**
 * `root`, held open while `locked`: Escape, a press on the dimmed page and
 * every close button do nothing, so a request in flight can't lose its answer.
 */
export function lockedRoot(
  root: DialogRootState,
  locked: boolean,
): DialogRootState {
  return locked
    ? {
        ...root,
        onOpenChange: (open) => {
          if (open) root.onOpenChange(open);
        },
      }
    : root;
}

/**
 * One dialog of a screen at a time, and what it acts on: `show(subject)`
 * opens it, and `subject` stays until the dialog has finished closing, so its
 * content doesn't vanish as it fades out. Spread `root` on the dialog's root.
 */
export function useDialogState<Subject>() {
  const [subject, setSubject] = useState<Subject | null>(null);
  const [open, setOpen] = useState(false);

  const show = useCallback((next: Subject) => {
    setSubject(next);
    setOpen(true);
  }, []);
  const root = useMemo(
    (): DialogRootState => ({
      open,
      onOpenChange: setOpen,
      onOpenChangeComplete: (stillOpen) => {
        if (!stillOpen) setSubject(null);
      },
    }),
    [open],
  );

  return { subject, show, root };
}
