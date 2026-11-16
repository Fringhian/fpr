import { useCallback } from "react";
import { useToast } from "../../components/molecules/toast/use-toast";
import { useErrorText } from "./errors";

/**
 * Says why a write was refused: a toast titled `title`, with the reason under
 * it, that stays until dismissed. `reason` writes the error out, the API's
 * own text by default.
 */
export function useRefusedToast(reason?: (error: unknown) => string) {
  const toast = useToast();
  const errorText = useErrorText();

  const describe = reason ?? errorText;

  return useCallback(
    (title: string, error: unknown) =>
      toast.show({ title, description: describe(error), timeout: 0 }),
    [toast, describe],
  );
}
