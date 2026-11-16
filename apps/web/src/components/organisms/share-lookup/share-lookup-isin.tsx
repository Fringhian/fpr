import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { isinIn } from "../../../lib/isin";
import { Button } from "../../atoms/button/button";
import { TextLink } from "../../atoms/text-link/text-link";
import * as Field from "../../molecules/field/field";

export type IsinAskProps = {
  /** The listing's name, which the field's label names. */
  name: string;
  /** Stores the listing under the ISIN typed, once it is one. */
  onAdd: (isin: string) => void;
  onCancel: () => void;
  /** The ISIN is on its way to the API. */
  adding: boolean;
  /** Why the API refused the ISIN, written out. */
  error?: string | null | undefined;
  /** The share that already has the ISIN, as the router's link, under `error`. */
  takenLink?: ReactElement | null | undefined;
};

/**
 * The ISIN a listing is stored under, then Add share, which checks it
 * first; Enter adds too. No `<form>`: it sits inside the Shares search,
 * which a step's form may hold.
 */
export function IsinAsk({
  name,
  onAdd,
  onCancel,
  adding,
  error,
  takenLink,
}: IsinAskProps) {
  const { t } = useTranslation();
  const [isin, setIsin] = useState("");
  const [tried, setTried] = useState(false);

  const valid = isinIn(isin);
  const message =
    tried && valid === null
      ? t("shareLookup.isin.invalid")
      : tried
        ? (error ?? null)
        : null;
  const add = () => {
    setTried(true);
    if (valid !== null) onAdd(valid);
  };

  return (
    <div className="grid gap-s">
      <Field.Root name="isin" invalid={message !== null}>
        <Field.Label>{t("shareLookup.isin.label", { name })}</Field.Label>
        <Field.Control
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="characters"
          value={isin}
          onValueChange={(text) => {
            setIsin(text.toUpperCase());
            setTried(false);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            add();
          }}
        />
        {message === null ? (
          <Field.Description>{t("shareLookup.isin.help")}</Field.Description>
        ) : (
          <Field.Error match>{message}</Field.Error>
        )}
      </Field.Root>
      {takenLink && message !== null ? (
        <TextLink render={takenLink} toPage className="w-fit text-s">
          {t("shareLookup.openTaken")}
        </TextLink>
      ) : null}
      <div className="flex flex-wrap gap-s">
        <Button
          intent="primary"
          size="s"
          onClick={add}
          loading={adding}
          loadingLabel={t("shareLookup.adding")}
        >
          {t("shareLookup.addShare")}
        </Button>
        <Button intent="ghost" size="s" onClick={onCancel}>
          {t("shareLookup.cancel")}
        </Button>
      </div>
    </div>
  );
}
