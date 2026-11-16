import { Form } from "@base-ui/react/form";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import * as Field from "../../../components/molecules/field/field";
import { FormError } from "../../../components/molecules/form-error/form-error";
import { useToast } from "../../../components/molecules/toast/use-toast";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { PASSWORD, useAccessChecks } from "../../../lib/access-checks";
import { useApi } from "../../../lib/api/use-api";
import { AccessPage } from "../-access/access-page";
import { useRefusal } from "../-access/use-refusal";
import type { ResetPair } from "./check-step";

/**
 * A reset's second step: the new password. The API ends every session of the
 * person, so they land on sign-in, told to sign in with it.
 */
export function NewPasswordStep({
  pair,
  onBack,
}: {
  pair: ResetPair;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const navigate = useNavigate();
  const toast = useToast();
  const checks = useAccessChecks();
  const { formError, refuse, refuseError } = useRefusal();
  const reset = useMutation(api.access.reset.mutationOptions());

  const submit = ({ password }: { password: string }) => {
    refuse(null);
    reset.mutate(
      { ...pair, password },
      {
        onSuccess: async () => {
          await navigate({ to: "/sign-in", replace: true });
          toast.show({
            title: t("resetPassword.done"),
            description: t("resetPassword.doneDescription"),
          });
        },
        onError: refuseError,
      },
    );
  };

  return (
    <AccessPage
      back={{ render: <button type="button" onClick={onBack} /> }}
      progress={{ step: 2, count: 2 }}
    >
      <Form<{ password: string }> className="contents" onFormSubmit={submit}>
        <StepFlow.Body>
          <StepFlow.Question>
            {t("resetPassword.newQuestion")}
          </StepFlow.Question>
          <StepFlow.Description>
            {t("resetPassword.newDescription")}
          </StepFlow.Description>
          {/* The account the new password is for, which password managers save it under. */}
          <input
            type="email"
            autoComplete="username"
            value={pair.email}
            readOnly
            hidden
          />
          <Field.Root name="password" validate={checks.newPassword}>
            <Field.Label>{t("resetPassword.password")}</Field.Label>
            <Field.Password autoComplete="new-password" />
            <Field.Description>
              {t("accessFields.passwordHelp", { min: PASSWORD.min })}
            </Field.Description>
            <Field.Error />
          </Field.Root>
          <FormError>{formError}</FormError>
        </StepFlow.Body>
        <StepFlow.Actions>
          <StepFlow.MainButton type="submit" loading={reset.isPending}>
            {t("resetPassword.save")}
          </StepFlow.MainButton>
        </StepFlow.Actions>
      </Form>
    </AccessPage>
  );
}
