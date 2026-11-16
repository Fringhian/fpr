import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useApi } from "../../../lib/api/use-api";
import { formatDate } from "../../../lib/format/date";
import { formatMoney } from "../../../lib/format/money";
import { formatQuantity } from "../../../lib/format/number";
import { useLanguage } from "../../../lib/i18n";
import { DEFAULT_SETTING } from "../../../lib/view-state/view-search";
import type { Draft } from "./draft";
import { useFlow } from "./flow";

function useShareName(draft: Draft): string | undefined {
  const api = useApi();
  const { entry, shareId, kind } = draft;
  const fromEntry = entry?.type === "change" ? entry.share : undefined;
  const share = useQuery(
    api.shares.get.queryOptions({
      input: { id: shareId ?? "", period: DEFAULT_SETTING.period },
      enabled:
        kind !== "cash" && shareId !== undefined && fromEntry?.id !== shareId,
    }),
  );

  if (kind === "cash") return undefined;
  return fromEntry?.id === shareId ? fromEntry?.name : share.data?.name;
}

/**
 * The draft's answers written out: what (“Bought”), the share's name, the
 * day (“3 March”), and how many or how much, each `undefined` until known;
 * and the caption above a step's question, joining those it is given, after
 * the member's name when the admin records for them.
 */
export function useDraftText() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { draft, owner } = useFlow();
  const share = useShareName(draft);

  const { kind, amount } = draft;
  const what = kind && t(`recordChange.kinds.${kind}.done`);
  const day = formatDate(draft.day, language, { style: "long" });
  const howMuch =
    amount === undefined
      ? undefined
      : kind === "cash"
        ? formatMoney(amount, language)
        : formatQuantity(amount, language);
  return {
    what,
    share,
    day,
    howMuch,
    caption: (...parts: (string | undefined)[]) =>
      [owner.own ? undefined : owner.name, ...parts]
        .filter((part) => part !== undefined)
        .join(" · "),
  };
}
