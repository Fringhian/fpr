import { Form } from "@base-ui/react/form";
import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { FormError } from "../../components/molecules/form-error/form-error";
import { useAccessChecks } from "../../lib/access-checks";
import { useApi } from "../../lib/api/use-api";
import { useSession } from "../../lib/session/use-session";
import { DisplayNameField } from "../-account/access-fields";
import { useRefusal } from "../-account/use-refusal";

const blame = { invalid_request: "displayName" } as const;

/**
 * The name the others see, saved when the field is left or on Enter. A name
 * the checks refuse stays in the field with its error, unsaved.
 */
export function NameSetting() {
  const { t } = useTranslation();
  const api = useApi();
  const { person } = useSession();
  const checks = useAccessChecks();
  const { errors, formError, refuse, refuseError } = useRefusal(blame);
  const update = useMutation(api.me.update.mutationOptions());
  // The name last sent, so Enter then leaving the field sends it once; `null`
  // compares with the account's, after a refusal or before any save.
  const sent = useRef<string | null>(null);

  const save = ({ displayName }: { displayName: string }) => {
    const name = displayName.trim();
    refuse(null);
    if (name === (sent.current ?? person.displayName)) {
      return;
    }
    sent.current = name;
    update.mutate(
      { displayName: name },
      {
        onError: (error) => {
          sent.current = null;
          refuseError(error);
        },
      },
    );
  };

  return (
    <Form<{ displayName: string }> errors={errors} onFormSubmit={save}>
      <DisplayNameField
        label={t("settings.name")}
        defaultValue={person.displayName}
        validationMode="onBlur"
        onBlur={(event) => {
          // A refused name would pull focus back to the field on submit.
          if (checks.displayName(event.currentTarget.value) === null) {
            event.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <FormError className="mt-s">{formError}</FormError>
    </Form>
  );
}
