import { Form } from "@base-ui/react/form";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { FormError } from "../../../components/molecules/form-error/form-error";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { useApi } from "../../../lib/api/use-api";
import { HiddenEmail, NewPasswordField } from "../../-account/access-fields";
import { useRefusal } from "../../-account/use-refusal";
import { AccessPage } from "../-access/access-page";
import { forgetAccessKey } from "./held-key";
import { type LinkState, refusedState } from "./open-link";

const blame = { invalid_request: "password" } as const;

/**
 * First use, step 2: the password. Only this step claims the link, so
 * leaving before it keeps the link valid. Claimed, the person is signed in
 * and starts onboarding. A link that stopped meanwhile is forgotten and
 * shows its state.
 */
export function PasswordStep({
  accessKey,
  email,
  onBack,
  onRefused,
}: {
  accessKey: string;
  email: string;
  onBack: () => void;
  onRefused: (state: LinkState) => void;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const navigate = useNavigate();
  const { errors, formError, refuse, refuseError } = useRefusal(blame);
  const claim = useMutation(api.access.claim.mutationOptions());

  const submit = ({ password }: { password: string }) => {
    refuse(null);
    claim.mutate(
      { key: accessKey, password },
      {
        onSuccess: () => {
          forgetAccessKey();
          return navigate({ to: "/onboarding", replace: true });
        },
        onError: (error) => {
          const state = refusedState(error);
          if (state === undefined) {
            refuseError(error);
            return;
          }
          forgetAccessKey();
          onRefused(state);
        },
      },
    );
  };

  return (
    <AccessPage
      back={{ render: <button type="button" onClick={onBack} /> }}
      progress={{ step: 2, count: 2 }}
    >
      <Form<{ password: string }>
        className="contents"
        errors={errors}
        onFormSubmit={submit}
      >
        <StepFlow.Body>
          <StepFlow.Question>
            {t("accessLink.password.question")}
          </StepFlow.Question>
          <HiddenEmail email={email} />
          <NewPasswordField />
          <FormError>{formError}</FormError>
        </StepFlow.Body>
        <StepFlow.Actions>
          <StepFlow.MainButton
            type="submit"
            next
            loading={claim.isPending}
            loadingLabel={t("accessLink.password.loading")}
          >
            {t("accessLink.password.action")}
          </StepFlow.MainButton>
        </StepFlow.Actions>
      </Form>
    </AccessPage>
  );
}
