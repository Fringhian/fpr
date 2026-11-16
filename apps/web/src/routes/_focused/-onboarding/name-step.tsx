import { Form } from "@base-ui/react/form";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FormError } from "../../../components/molecules/form-error/form-error";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { useApi } from "../../../lib/api/use-api";
import { lookOf } from "../../../lib/look";
import { useSession } from "../../../lib/session/use-session";
import { DisplayNameField } from "../../-account/access-fields";
import { useRefusal } from "../../-account/use-refusal";
import { LookPanel } from "./look-preview";
import { OnboardingPage } from "./onboarding-page";
import { useGoToStep } from "./steps";

const blame = { invalid_request: "displayName" } as const;

/**
 * Step 1: the name the others see, filled in with the one the admin entered.
 * A changed name is saved before the next step; the desktop shows it on the
 * person's picture and lane as it is typed.
 */
export function NameStep() {
  const { t } = useTranslation();
  const api = useApi();
  const { person } = useSession();
  const goToStep = useGoToStep();
  const [typed, setTyped] = useState(person.displayName);
  const { errors, formError, refuse, refuseError } = useRefusal(blame);
  const update = useMutation(api.me.update.mutationOptions());

  const shown = typed.trim() === "" ? person.displayName : typed.trim();
  const submit = ({ displayName }: { displayName: string }) => {
    const name = displayName.trim();
    refuse(null);
    if (name === person.displayName) {
      void goToStep("look");
      return;
    }
    update.mutate(
      { displayName: name },
      { onSuccess: () => goToStep("look"), onError: refuseError },
    );
  };

  return (
    <OnboardingPage
      step="name"
      panel={<LookPanel look={{ ...lookOf(person), name: shown }} />}
    >
      <Form<{ displayName: string }>
        className="contents"
        errors={errors}
        onFormSubmit={submit}
      >
        <StepFlow.Body>
          <StepFlow.Question>{t("onboarding.name.question")}</StepFlow.Question>
          <DisplayNameField
            label={t("onboarding.name.label")}
            help={t("onboarding.name.help")}
            hiddenLabel
            defaultValue={person.displayName}
            onValueChange={setTyped}
          />
          <FormError>{formError}</FormError>
        </StepFlow.Body>
        <StepFlow.Actions>
          <StepFlow.MainButton
            type="submit"
            next
            loading={update.isPending}
            loadingLabel={t("onboarding.saving")}
          >
            {t("onboarding.name.action")}
          </StepFlow.MainButton>
        </StepFlow.Actions>
      </Form>
    </OnboardingPage>
  );
}
