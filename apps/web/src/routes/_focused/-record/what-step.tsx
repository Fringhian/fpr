import { CoinsIcon } from "@phosphor-icons/react/Coins";
import { MinusIcon } from "@phosphor-icons/react/Minus";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { type FormEvent, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { FormError } from "../../../components/molecules/form-error/form-error";
import * as Option from "../../../components/molecules/option/option";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import type { RecordKind } from "../../../lib/record-search";
import { useFlow } from "./flow";
import { RecordPage } from "./record-page";
import { useDraftText } from "./use-draft-text";

const KINDS = [
  { kind: "buy", icon: PlusIcon },
  { kind: "sell", icon: MinusIcon },
  { kind: "cash", icon: CoinsIcon },
] as const;

/** The three answers: bought shares, sold shares, cash. */
function KindOptions(props: Option.GroupProps<RecordKind>) {
  const { t } = useTranslation();

  return (
    <Option.Group<RecordKind> {...props}>
      {KINDS.map(({ kind, icon }) => (
        <Option.Item<RecordKind>
          key={kind}
          value={kind}
          icon={icon}
          title={t(`recordChange.kinds.${kind}.option`)}
          description={t(`recordChange.kinds.${kind}.line`)}
        />
      ))}
    </Option.Group>
  );
}

/**
 * Step 1, What changed: bought, sold, or cash. Cash goes on to the day, a
 * purchase or a sale to the share; changing what drops the answers that
 * depended on it.
 */
export function WhatStep() {
  const { t } = useTranslation();
  const { draft, goTo } = useFlow();
  const text = useDraftText();
  const heading = useId();
  const [kind, setKind] = useState<RecordKind | undefined>(draft.kind);
  const [missing, setMissing] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (kind === undefined) {
      setMissing(true);
      return;
    }
    const same = kind === draft.kind;
    goTo(kind === "cash" ? "when" : "share", {
      kind,
      share: kind === "cash" ? undefined : draft.shareId,
      amount: same ? draft.amount : undefined,
    });
  };

  return (
    <RecordPage>
      <form className="contents" noValidate onSubmit={submit}>
        <StepFlow.Body>
          {text.caption() ? (
            <StepFlow.Caption>{text.caption()}</StepFlow.Caption>
          ) : null}
          <StepFlow.Question id={heading}>
            {t("recordChange.what.question")}
          </StepFlow.Question>
          <KindOptions
            aria-labelledby={heading}
            defaultValue={draft.kind}
            onValueChange={(value) => {
              setKind(value);
              setMissing(false);
            }}
          />
          <FormError>
            {missing ? t("recordChange.what.missing") : null}
          </FormError>
        </StepFlow.Body>
        <StepFlow.Actions>
          <StepFlow.MainButton type="submit" next>
            {t(
              kind === "cash"
                ? "recordChange.actions.date"
                : "recordChange.actions.share",
            )}
          </StepFlow.MainButton>
        </StepFlow.Actions>
      </form>
    </RecordPage>
  );
}
