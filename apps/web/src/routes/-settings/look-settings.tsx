import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Picture } from "../../components/atoms/picture/picture";
import * as Field from "../../components/molecules/field/field";
import { FormError } from "../../components/molecules/form-error/form-error";
import { lookOf } from "../../lib/look";
import { useSession } from "../../lib/session/use-session";
import { ColourPicker } from "../-account/colour-picker";
import { PhotoControl } from "../-account/photo-control";
import { useColourChoice } from "../-account/use-colour-choice";

/**
 * The person's picture with its photo, then their colour, saved as soon as
 * it is picked. A colour taken meanwhile is refused, and the colours refresh.
 */
export function LookSettings() {
  const { t } = useTranslation();
  const { person } = useSession();
  const colourId = useId();
  const saved = lookOf(person);
  const choice = useColourChoice(saved.color);

  const look = { ...saved, color: choice.color };

  return (
    <>
      <PhotoControl
        hasPhoto={look.photo !== null}
        addLabel={t("settings.addPhoto")}
      >
        <Picture
          name={look.name}
          color={look.color}
          photo={look.photo}
          size="l"
          aria-hidden
        />
      </PhotoControl>
      <div className="flex flex-col">
        <Field.GroupLabel id={colourId}>
          {t("settings.colour")}
        </Field.GroupLabel>
        <ColourPicker
          value={choice.color}
          onValueChange={choice.save}
          taken={choice.taken}
          labelledBy={colourId}
        />
        <FormError className="mt-s">{choice.error}</FormError>
      </div>
    </>
  );
}
