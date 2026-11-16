import type { IsoDate, ShareSummary } from "@fpr/contracts";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../components/molecules/toast/use-toast";
import { isinTakenBy, useErrorText } from "../../../lib/api/errors";
import { useApi } from "../../../lib/api/use-api";
import { useLanguage } from "../../../lib/i18n";
import type { NewShareSearch } from "../../../lib/new-share-search";
import { bodyOf, type ShareDraft } from "./draft";

/** `back` with the new share picked, as Record a change's search names it. */
function pickedIn(back: string, share: ShareSummary): string {
  const url = new URL(back, window.location.origin);
  url.searchParams.set("share", share.id);
  return `${url.pathname}${url.search}`;
}

/**
 * Where the page leads once the share exists: its page, or with `pick`,
 * back to the page it was opened from with the share picked.
 */
function useLeave({ back, pick }: NewShareSearch) {
  const navigate = useNavigate();

  return (share: ShareSummary) =>
    void (pick && back
      ? navigate({ href: pickedIn(back, share), ignoreBlocker: true })
      : navigate({
          to: "/shares/$shareId",
          params: { shareId: share.id },
          ignoreBlocker: true,
        }));
}

/**
 * Creates the manual share the draft describes, says so, and leaves for
 * its page, or back with it picked. `refusal` is why the API refused it,
 * and `takenBy` the share that has its ISIN already, when that is why.
 */
export function useCreateShare(search: NewShareSearch, today: IsoDate) {
  const { t } = useTranslation();
  const language = useLanguage();
  const errorText = useErrorText();
  const api = useApi();
  const toast = useToast();
  const leave = useLeave(search);
  const create = useMutation(api.shares.createManual.mutationOptions());

  return {
    create: (draft: ShareDraft) => {
      const body = bodyOf(draft, today, language);
      if (body === null) return;
      create.mutate(body, {
        onSuccess: (share) => {
          toast.show({ title: t("newShare.created", { name: share.name }) });
          leave(share);
        },
      });
    },
    pending: create.isPending,
    created: create.isSuccess,
    refusal:
      isinTakenBy(create.error) !== null
        ? t("shareLookup.isinTaken")
        : create.isError
          ? errorText(create.error)
          : null,
    takenBy: isinTakenBy(create.error),
    reset: () => {
      if (create.isError) create.reset();
    },
  };
}
