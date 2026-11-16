import { Form } from "@base-ui/react/form";
import type { AdminShare } from "@fpr/contracts";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../components/atoms/button/button";
import * as Dialog from "../../../../components/molecules/dialog/dialog";
import { FormError } from "../../../../components/molecules/form-error/form-error";
import { useToast } from "../../../../components/molecules/toast/use-toast";
import { useApi } from "../../../../lib/api/use-api";
import { startOfDay } from "../../../../lib/date-field";
import type { DialogRootState } from "../../../../lib/dialog-state";
import { formatMoney } from "../../../../lib/format/money";
import { formatList } from "../../../../lib/format/text";
import { useLanguage } from "../../../../lib/i18n";
import { usePriceTime } from "../../../../lib/price-time";
import { RACE_TIME_ZONE } from "../../../../lib/race-day";
import { useRefusal } from "../../../-account/use-refusal";
import { DialogHeading } from "../-shared/dialog-heading";
import { FirstValueFields } from "./first-value-fields";
import { typedPrice } from "./shares-model";

type FirstValue = { priceEur?: string; on?: string };

const blame = { future_moment: "on", invalid_request: "priceEur" } as const;

/** What becomes the share's first value: its latest price, or the one the admin types, with who holds it. */
function FirstValueNote({ share }: { share: AdminShare }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const priceTime = usePriceTime();

  const holders = formatList(
    share.holders.map((holder) => holder.displayName),
    language,
  );
  const { latestPrice } = share;
  return (
    <p className="text-xs text-secondary">
      {latestPrice === null
        ? t("adminShares.makeManual.noPrice", {
            holders,
            count: share.holders.length,
          })
        : t("adminShares.makeManual.fromPrice", {
            price: formatMoney(latestPrice.priceEur, language),
            when: priceTime(latestPrice, RACE_TIME_ZONE),
          })}
    </p>
  );
}

/**
 * Makes the share manual, with the typed first value when it has no price,
 * then says so in a toast and closes. A refusal shows under its field, or the
 * form.
 */
function useMakeManual(share: AdminShare, onDone: () => void) {
  const { t } = useTranslation();
  const api = useApi();
  const toast = useToast();
  const makeManual = useMutation(api.admin.makeManual.mutationOptions());
  const { errors, formError, refuseError } = useRefusal(blame);

  const submit = ({ priceEur = "", on = "" }: FirstValue) => {
    const price = typedPrice(priceEur);
    const first =
      share.latestPrice === null && price !== null
        ? { priceEur: price, at: startOfDay(on) }
        : {};
    makeManual.mutate(
      { id: share.id, ...first },
      {
        onSuccess: () => {
          toast.show({
            title: t("adminShares.makeManual.done"),
            description: share.name,
          });
          onDone();
        },
        onError: refuseError,
      },
    );
  };

  return { submit, busy: makeManual.isPending, errors, formError };
}

/**
 * Make manual, which can't be undone: the share's latest price becomes its
 * first value, or, with no price at all, the value the admin types for a day.
 */
export function MakeManualDialog({
  share,
  root,
}: {
  share: AdminShare;
  root: DialogRootState;
}) {
  const { t } = useTranslation();
  const { submit, busy, errors, formError } = useMakeManual(share, () =>
    root.onOpenChange(false),
  );

  return (
    <Dialog.Root {...root}>
      <Dialog.Popup>
        <Form<FirstValue>
          errors={errors}
          onFormSubmit={submit}
          className="contents"
        >
          <DialogHeading>
            {t("adminShares.makeManual.title", { name: share.name })}
          </DialogHeading>
          <Dialog.Description>
            {t("adminShares.makeManual.description")}
          </Dialog.Description>
          {share.latestPrice === null ? <FirstValueFields /> : null}
          <FirstValueNote share={share} />
          <FormError>{formError}</FormError>
          <Dialog.Footer>
            <Dialog.Cancel />
            <Button type="submit" intent="primary" loading={busy}>
              {t("adminShares.actions.makeManual")}
            </Button>
          </Dialog.Footer>
        </Form>
      </Dialog.Popup>
    </Dialog.Root>
  );
}
