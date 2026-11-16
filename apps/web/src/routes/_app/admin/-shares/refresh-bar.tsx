import { ArrowsClockwiseIcon } from "@phosphor-icons/react/ArrowsClockwise";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../components/atoms/button/button";
import { FormError } from "../../../../components/molecules/form-error/form-error";
import { useErrorText } from "../../../../lib/api/errors";
import { useApi } from "../../../../lib/api/use-api";
import { RefreshStatus } from "./refresh-status";

/**
 * The price refresh: its state, and for the admin Refresh prices now, which
 * runs it at once and shows the run it made in the state. A refusal, while a
 * run is going or once the day's calls are used up, says why under the
 * button.
 */
export function RefreshBar({ readOnly }: { readOnly: boolean }) {
  const { t } = useTranslation();
  const api = useApi();
  const errorText = useErrorText();
  const refresh = useMutation(api.admin.refreshPrices.mutationOptions());

  return (
    <div className="flex flex-col gap-s pb-l">
      <div className="flex flex-wrap items-center justify-between gap-m">
        <RefreshStatus />
        {readOnly ? null : (
          <Button
            icon={ArrowsClockwiseIcon}
            loading={refresh.isPending}
            loadingLabel={t("adminShares.refresh.running")}
            onClick={() => {
              refresh.reset();
              refresh.mutate();
            }}
          >
            {t("adminShares.refresh.action")}
          </Button>
        )}
      </div>
      <FormError className="self-end">
        {refresh.isError ? errorText(refresh.error) : null}
      </FormError>
    </div>
  );
}
