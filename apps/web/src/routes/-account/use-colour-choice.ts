import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
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
  const latest = useRef(saved);
  const sending = useRef(false);

  // One save runs at a time. Each one that ends sends the latest pick when
  // it differs from what the account now has, so the account ends on the
  // last colour picked, whatever order the picks came in.
  const settle = (onAccount: MemberColor) => {
    const next = latest.current;
    if (next === onAccount) {
      sending.current = false;
      onSaved?.();
      return;
    }
    sending.current = true;
    update.mutate(
      { color: MEMBER_COLORS.indexOf(next) + 1 },
      {
        onSuccess: () => settle(next),
        onError: (error) => {
          if (isApiError(error, "color_taken")) refresh();
          if (latest.current !== next) {
            settle(onAccount);
            return;
          }
          sending.current = false;
          refuseError(error);
          if (isApiError(error, "color_taken")) {
            latest.current = onAccount;
            setColor(onAccount);
          }
        },
      },
    );
  };

  const save = (picked: MemberColor = color) => {
    refuse(null);
    setColor(picked);
    latest.current = picked;
    if (!sending.current) settle(saved);
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
