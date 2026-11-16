import { CurrencyEurIcon } from "@phosphor-icons/react/CurrencyEur";
import Big from "big.js";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/atoms/button/button";
import { formatDate } from "../../../lib/format/date";
import { formatMoney } from "../../../lib/format/money";
import { formatQuantity } from "../../../lib/format/number";
import { useLanguage } from "../../../lib/i18n";
import { RACE_TIME_ZONE } from "../../../lib/race-day";
import { amountText } from "./amount";
import { AmountForm } from "./amount-form";
import { useFlow } from "./flow";
import { RecordPage } from "./record-page";
import { useCashBefore, useHeldOn } from "./use-before";
import { useDraftText } from "./use-draft-text";

/** The text typed in the field, starting from the draft's amount. */
function useTyped() {
  const language = useLanguage();
  const { draft } = useFlow();

  return useState(() =>
    draft.amount === undefined ? "" : amountText(draft.amount, language),
  );
}

/**
 * How many were bought or sold, decimals kept. A sale shows how many were
 * held that day, with All, and refuses more.
 */
function QuantityStep() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { draft, owner } = useFlow();
  const text = useDraftText();
  const held = useHeldOn();
  const [typed, setTyped] = useTyped();

  const sale = draft.kind === "sell";
  const who = owner.own ? "you" : "member";
  const heldText =
    held === undefined
      ? t("recordChange.quantity.loadingHeld")
      : t(`recordChange.quantity.held.${who}`, {
          quantity: formatQuantity(held, language),
          date: text.day,
          name: owner.name,
        });
  return (
    <AmountForm
      caption={text.caption(text.what, text.share, text.day)}
      question={t(
        `recordChange.quantity.question.${sale ? "sell" : "buy"}.${who}`,
        {
          name: owner.name,
        },
      )}
      label={t("recordChange.quantity.label")}
      help={sale ? heldText : t("recordChange.quantity.help")}
      value={typed}
      onValueChange={setTyped}
      check={(amount) =>
        sale && held !== undefined && new Big(amount).gt(held)
          ? t("recordChange.quantity.tooMany", {
              held: heldText,
              quantity: formatQuantity(held, language),
            })
          : null
      }
      end={
        sale && held !== undefined && new Big(held).gt(0) ? (
          <AllButton onClick={() => setTyped(amountText(held, language))} />
        ) : null
      }
    />
  );
}

/** All, at the quantity's end on a sale: fills in what was held that day. */
function AllButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();

  return (
    <Button
      type="button"
      intent="ghost"
      size="s"
      className="-me-xs"
      onClick={onClick}
    >
      {t("recordChange.quantity.all")}
    </Button>
  );
}

/** The cash held from that day, with the balance set before it. */
function CashStep() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { owner } = useFlow();
  const text = useDraftText();
  const before = useCashBefore();
  const [typed, setTyped] = useTyped();

  const help =
    before === undefined
      ? t("recordChange.cash.loadingBefore")
      : before === null
        ? t("recordChange.cash.noneBefore")
        : t("recordChange.cash.before", {
            amount: formatMoney(before.amountEur, language),
            date: formatDate(before.effectiveAt, language, {
              style: "long",
              timeZone: RACE_TIME_ZONE,
            }),
          });
  return (
    <AmountForm
      caption={text.caption(text.what, text.day)}
      question={t(
        `recordChange.cash.question.${owner.own ? "you" : "member"}`,
        {
          date: text.day,
          name: owner.name,
        },
      )}
      label={t("recordChange.cash.label")}
      help={help}
      icon={CurrencyEurIcon}
      orZero
      value={typed}
      onValueChange={setTyped}
    />
  );
}

/** How many, or how much for cash. */
export function AmountStep() {
  const { draft } = useFlow();

  return (
    <RecordPage>
      {draft.kind === "cash" ? <CashStep /> : <QuantityStep />}
    </RecordPage>
  );
}
