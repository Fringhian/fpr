import { Toast as BaseToast } from "@base-ui/react/toast";
import { type ReactNode, useMemo } from "react";
import { useTranslation } from "react-i18next";

/** How long an Undo toast stays, in ms: long enough to read it and change one's mind. */
export const UNDO_TIMEOUT = 8000;

type Message = {
  /** What happened, in a few words: “Change deleted”. */
  title: ReactNode;
  /** One more line, when the title needs one. */
  description?: ReactNode;
  /** How long it stays, in ms, in place of its kind's; `0` keeps it until dismissed. */
  timeout?: number;
};

/**
 * Shows toasts in the nearest `Toast.Provider`'s region. Each call returns
 * the toast's id, which `close` takes. The functions stay the same from one
 * render to the next.
 */
export function useToast() {
  const { t } = useTranslation();
  const { add, close } = BaseToast.useToastManager();

  return useMemo(
    () => ({
      /** A message that goes by itself after 5 s. */
      show: (message: Message) => add(message),
      /**
       * A message with Undo, which stays 8 s: a press on Undo closes it and
       * runs `onUndo`, which reverses what was just done.
       */
      offerUndo: ({ onUndo, ...message }: Message & { onUndo: () => void }) => {
        const id: string = add({
          timeout: UNDO_TIMEOUT,
          ...message,
          actionProps: {
            children: t("toast.undo"),
            onClick: () => {
              close(id);
              onUndo();
            },
          },
        });
        return id;
      },
      close,
    }),
    [add, close, t],
  );
}
