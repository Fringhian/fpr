import {
  accessKeyPattern,
  displayNameMaxLength,
  passwordLength,
} from "@fpr/contracts/values";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The access key in a pasted access link, `https://…/access/<key>`, or in
 * the key alone, or nothing when the text holds neither.
 */
export function accessKeyIn(text: string): string | undefined {
  const trimmed = text.trim();
  const key = /\/access\/([^/?#]+)/.exec(trimmed)?.[1] ?? trimmed;
  return accessKeyPattern.test(key) ? key : undefined;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * The checks of the fields that get a person in, as `Field.Root`'s
 * `validate`: each returns the error to show, or `null`. They mirror the
 * API's, so a form sends only what it accepts.
 */
export function useAccessChecks() {
  const { t } = useTranslation();

  return useMemo(
    () => ({
      email: (value: unknown) => {
        const email = text(value).trim();
        if (email === "") return t("accessChecks.emailMissing");
        return EMAIL.test(email) ? null : t("accessChecks.emailInvalid");
      },
      /** A password being typed to sign in: any length the person chose. */
      password: (value: unknown) =>
        text(value) === "" ? t("accessChecks.passwordMissing") : null,
      /** A password being chosen. */
      newPassword: (value: unknown) => {
        const { length } = text(value);
        if (length < passwordLength.min) {
          return t("accessChecks.passwordShort", { min: passwordLength.min });
        }
        return length > passwordLength.max
          ? t("accessChecks.passwordLong", { max: passwordLength.max })
          : null;
      },
      displayName: (value: unknown) => {
        const name = text(value).trim();
        if (name === "") return t("accessChecks.nameMissing");
        return name.length > displayNameMaxLength
          ? t("accessChecks.nameLong", { max: displayNameMaxLength })
          : null;
      },
      /** A key pasted from the admin or the server's configuration. */
      key: (value: unknown) =>
        text(value).trim() === "" ? t("accessChecks.keyMissing") : null,
      accessLink: (value: unknown) =>
        accessKeyIn(text(value)) === undefined
          ? t("accessChecks.accessLinkInvalid")
          : null,
    }),
    [t],
  );
}
