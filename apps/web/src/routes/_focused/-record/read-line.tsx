import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/atoms/button/button";
import { useReadFailedText } from "../../../lib/api/errors";
import type { BeforeRead } from "./use-before";

/**
 * What a step says of a read: `loading` while it loads, `failed` with Try
 * again once it fails, else `done` of its value. Phrasing content, for a
 * field's help or a card's line.
 */
export function ReadLine<T>({
  read,
  loading,
  failed,
  done,
}: {
  read: BeforeRead<T>;
  loading: ReactNode;
  failed: string;
  done: (value: T) => ReactNode;
}) {
  const { t } = useTranslation();
  const failedText = useReadFailedText(failed);

  if (read.failed) {
    return (
      <span className="inline-flex flex-wrap items-center gap-s">
        <span role="alert">{failedText}</span>
        <Button type="button" size="s" onClick={read.retry}>
          {t("recordChange.load.retry")}
        </Button>
      </span>
    );
  }
  return read.value === undefined ? loading : done(read.value);
}
