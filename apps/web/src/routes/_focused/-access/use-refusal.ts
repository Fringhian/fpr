import type { ErrorCode } from "@fpr/contracts";
import { ORPCError } from "@orpc/client";
import { useMemo, useState } from "react";
import { useErrorText } from "../../../lib/api/errors";

/**
 * Why the API refused a form: the field it blames, or the whole form, and the
 * text to show. `untilEdit` marks a refusal of the form's fields together,
 * such as a wrong email and password pair, which clears once any field changes.
 */
export type Refusal<Field extends string> = {
  field?: Field | undefined;
  text: string;
  untilEdit?: boolean;
};

/**
 * The API's last refusal of a form, as Base UI's `Form` takes it: `errors`
 * for the field it blames, which clears once that field changes, and
 * `formError` for the rest. Each refusal is a new `errors` object, so the
 * same refusal twice shows again, and focus moves to the field it blames.
 * `refuseError` writes a call's error under the field `blame` names for its
 * code, else under the form. `edited`, the form's `onInput`, clears an
 * `untilEdit` refusal.
 */
export function useRefusal<Field extends string>(
  blame: Partial<Record<ErrorCode, Field>> = {},
) {
  const errorText = useErrorText();
  const [refusal, setRefusal] = useState<Refusal<Field> | null>(null);

  const errors = useMemo(
    (): Record<string, string> =>
      refusal?.field === undefined ? {} : { [refusal.field]: refusal.text },
    [refusal],
  );
  const formError =
    refusal !== null && refusal.field === undefined ? refusal.text : null;
  const refuseError = (error: unknown) => {
    const code = error instanceof ORPCError ? error.code : undefined;
    setRefusal({
      field: Object.entries(blame).find(([blamed]) => blamed === code)?.[1],
      text: errorText(error),
    });
  };

  const edited = () =>
    setRefusal((last) => (last?.untilEdit === true ? null : last));

  return { errors, formError, refuse: setRefusal, refuseError, edited };
}
