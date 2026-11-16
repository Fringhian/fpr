import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { isApiError } from "../../lib/api/errors";
import { useApi } from "../../lib/api/use-api";
import { MEMBER_COLORS, type MemberColor } from "../../lib/member-color";
import { useTakenColours } from "./colour-picker";
import { useRefusal } from "./use-refusal";

/**
 * The colour being picked, starting on the saved one, and `save`, which
 * keeps the picked colour, or the one it is given, on the account before
 * `onSaved`. A colour taken meanwhile is refused: the taken colours refresh
 * and the saved one comes back, with the API's reason in `error`.
 */
export function useColourChoice(saved: MemberColor, onSaved?: () => void) {
  const api = useApi();
  const [color, setColor] = useState(saved);
  const { taken, refresh } = useTakenColours(saved);
  const { formError, refuse, refuseError } = useRefusal();
  const update = useMutation(api.me.update.mutationOptions());

  const save = (picked: MemberColor = color) => {
    refuse(null);
    setColor(picked);
    if (picked === saved) {
      onSaved?.();
      return;
    }
    update.mutate(
      { color: MEMBER_COLORS.indexOf(picked) + 1 },
      {
        onSuccess: () => onSaved?.(),
        onError: (error) => {
          refuseError(error);
          if (isApiError(error, "color_taken")) {
            setColor(saved);
            refresh();
          }
        },
      },
    );
  };

  return {
    color,
    setColor,
    taken,
    error: formError,
    saving: update.isPending,
    save,
  };
}
