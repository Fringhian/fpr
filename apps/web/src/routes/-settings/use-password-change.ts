import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useUnreachableText } from "../../lib/api/errors";
import {
  changePassword,
  type PasswordChangeOutcome,
} from "../../lib/session/better-auth";
import {
  signInAgain,
  signOutOnAccessEnded,
} from "../../lib/session/session-ended";
import { type Refusal, useRefusal } from "../-account/use-refusal";

/** The form's fields: the current password, and the new one, `password`, as `NewPasswordField` names it. */
export type Passwords = { currentPassword: string; password: string };

/**
 * Changes the password with the current one, then runs `onChanged`. A wrong
 * current password is refused under its field; too many attempts and a
 * failed call under the form. A session that expired leads to sign-in, and
 * an access that ended signs the person out.
 */
export function usePasswordChange(onChanged: () => void) {
  const { t } = useTranslation();
  const { errors, formError, refuse } = useRefusal<"currentPassword">();
  const change = useMutation({ mutationFn: changePassword });
  const unreachableText = useUnreachableText();

  const refusals: Record<
    Exclude<PasswordChangeOutcome, "changed" | "signedOut" | "accessEnded">,
    Refusal<"currentPassword">
  > = {
    wrongPassword: {
      field: "currentPassword",
      text: t("settings.password.wrong"),
    },
    rateLimited: { text: t("errors.rateLimited") },
    failed: { text: t("errors.internalError") },
    unreachable: { text: unreachableText },
  };
  const submit = ({ currentPassword, password }: Passwords) => {
    refuse(null);
    change.mutate(
      { currentPassword, newPassword: password },
      {
        onSuccess: (outcome) => {
          if (outcome === "changed") onChanged();
          else if (outcome === "signedOut") signInAgain();
          else if (outcome === "accessEnded") signOutOnAccessEnded();
          else refuse(refusals[outcome]);
        },
      },
    );
  };

  return { errors, formError, submit, pending: change.isPending };
}
