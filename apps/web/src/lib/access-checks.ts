import { useMemo } from "react";
import { useTranslation } from "react-i18next";

// The contracts' limits, which `@fpr/contracts/values` doesn't export: a
// password of 12 to 128 characters, a display name of 1 to 40 once trimmed,
// and an access key of 43 base64url characters.
export const PASSWORD = { min: 12, max: 128 } as const;
const DISPLAY_NAME_MAX = 40;
const ACCESS_KEY = /(?:^|\/access\/)([A-Za-z0-9_-]{43})(?:[/?#]|$)/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The access key in a pasted access link, `https://…/access/<key>`, or in
 * the key alone, or nothing when the text holds neither.
 */
export function accessKeyIn(text: string): string | undefined {
  return ACCESS_KEY.exec(text.trim())?.[1];
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
        if (length < PASSWORD.min) {
          return t("accessChecks.passwordShort", { count: PASSWORD.min });
        }
        return length > PASSWORD.max
          ? t("accessChecks.passwordLong", { count: PASSWORD.max })
          : null;
      },
      displayName: (value: unknown) => {
        const name = text(value).trim();
        if (name === "") return t("accessChecks.nameMissing");
        return name.length > DISPLAY_NAME_MAX
          ? t("accessChecks.nameLong", { count: DISPLAY_NAME_MAX })
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
