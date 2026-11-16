import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { quote } from "../../../lib/format/text";
import { useLanguage } from "../../../lib/i18n";
import { Button } from "../../atoms/button/button";
import { LoadingPlaceholder } from "../../atoms/loading-placeholder/loading-placeholder";
import { FormError } from "../../molecules/form-error/form-error";

/** A line under the search that says what it found, or why it found nothing. */
export function Message({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      role="status"
      {...props}
      className={cn("text-s text-secondary", className)}
    />
  );
}

/**
 * What stands in for the results: a failed search with Try again, the first
 * load, or a line saying nothing matches the text typed, or that FPR has no
 * shares yet.
 */
export function Status({
  q,
  loading,
  error,
  onRetry,
}: {
  q: string;
  loading: boolean;
  error?: string | null | undefined;
  onRetry?: (() => void) | undefined;
}) {
  const { t } = useTranslation();
  const language = useLanguage();

  if (error) {
    return (
      <div className="grid justify-items-start gap-s">
        <FormError>{error}</FormError>
        {onRetry ? (
          <Button type="button" size="s" onClick={onRetry}>
            {t("shareSearch.retry")}
          </Button>
        ) : null}
      </div>
    );
  }
  if (loading) {
    return (
      <LoadingPlaceholder className="min-h-[10rem]">
        {t("shareSearch.loading")}
      </LoadingPlaceholder>
    );
  }
  const query = q.trim();
  return (
    <Message>
      {query === ""
        ? t("shareSearch.empty")
        : t("shareSearch.none", { q: quote(query, language) })}
    </Message>
  );
}
