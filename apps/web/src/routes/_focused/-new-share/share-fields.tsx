import type { IsoDate } from "@fpr/contracts";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { DayField } from "../../../components/molecules/day-field/day-field";
import {
  IsinField,
  NameField,
  PriceField,
} from "../../-share-fields/share-fields";
import type { ShareDraft } from "./draft";

/**
 * Create a manual share's fields: the ISIN, the name, then the value of one
 * unit beside its day. Each checks itself as it is submitted; the API's
 * refusal of the ISIN shows under it, with `takenLink` to the share that has
 * it.
 */
export function ShareFields({
  draft,
  onChange,
  today,
  takenLink,
}: {
  draft: ShareDraft;
  onChange: (patch: Partial<ShareDraft>) => void;
  today: IsoDate;
  takenLink: ReactElement | null;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-m">
      <IsinField
        value={draft.isin}
        onValueChange={(isin) => onChange({ isin })}
        takenLink={takenLink}
      />
      <NameField
        value={draft.name}
        onValueChange={(name) => onChange({ name })}
      />
      <div className="grid grid-cols-2 items-start gap-m">
        <PriceField
          value={draft.price}
          onValueChange={(price) => onChange({ price })}
        />
        <DayField
          label={t("shareFields.day.label")}
          value={draft.day}
          onValueChange={(day) => onChange({ day })}
          max={today}
          today={today}
        />
      </div>
    </div>
  );
}
