import { useCallback } from "react";
import { useToast } from "../../components/molecules/toast/use-toast";
import { useErrorText } from "./errors";

/**
 * Says why a write was refused: a toast titled `title`, with the API's reason
 * under it, that stays until dismissed.
 */
export function useRefusedToast() {
  const toast = useToast();
  const errorText = useErrorText();

  return useCallback(
    (title: string, error: unknown) =>
      toast.show({ title, description: errorText(error), timeout: 0 }),
    [toast, errorText],
  );
}
