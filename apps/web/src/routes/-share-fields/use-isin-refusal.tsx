import { Link } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { isinTakenBy, useErrorText } from "../../lib/api/errors";

/**
 * Why a write of a share's ISIN failed, from its `error`, `null` while it
 * hasn't: `text` says why, and when another share has the ISIN already,
 * `takenLink` opens that share, and the text belongs under the ISIN.
 */
export function useIsinRefusal(error: unknown): {
  text: string | null;
  takenLink: ReactElement | null;
} {
  const { t } = useTranslation();
  const errorText = useErrorText();

  const takenBy = isinTakenBy(error);
  if (takenBy !== null) {
    return {
      text: t("shareLookup.isinTaken"),
      takenLink: <Link to="/shares/$shareId" params={{ shareId: takenBy }} />,
    };
  }
  return { text: error == null ? null : errorText(error), takenLink: null };
}
