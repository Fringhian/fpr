import { Form } from "@base-ui/react/form";
import { getRouteApi, Link } from "@tanstack/react-router";
import { Trans, useTranslation } from "react-i18next";
import { TextLink } from "../../../components/atoms/text-link/text-link";
import { FormError } from "../../../components/molecules/form-error/form-error";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { useUnreachableText } from "../../../lib/api/errors";
import type { SignInOutcome } from "../../../lib/session/better-auth";
import { CurrentPasswordField, EmailField } from "../../-account/access-fields";
import { type Refusal, useRefusal } from "../../-account/use-refusal";
import { AccessPage } from "../-access/access-page";
import { usePasswordSignIn } from "./use-password-sign-in";

const route = getRouteApi("/_focused/sign-in");

type Credentials = { email: string; password: string };

/** The ways out of sign-in: a reset, and a pasted access link for an installed app. */
function OtherWays() {
  return (
    <div className="grid gap-xs text-s text-secondary">
      <p>
        <Trans
          i18nKey="signIn.forgot"
          components={{
            go: <TextLink render={<Link to="/reset-password" />} />,
          }}
        />
      </p>
      <p>
        <Trans
          i18nKey="signIn.pasteLink"
          components={{
            go: (
              <TextLink
                render={
                  <Link
                    to="/sign-in"
                    search={(search) => ({ ...search, step: "link" })}
                  />
                }
              />
            ),
          }}
        />
      </p>
    </div>
  );
}

/**
 * Sign-in with an email and a password, on the made-up race. A wrong pair
 * says only that they don't match, under the form, until either field
 * changes; too many attempts and a failed call say so there too.
 */
export function SignInForm() {
  const { t } = useTranslation();
  const { redirect } = route.useSearch();
  const { formError, refuse, edited } = useRefusal();
  const signIn = usePasswordSignIn(redirect);
  const unreachableText = useUnreachableText();

  const refusals: Record<SignInOutcome, Refusal<never> | null> = {
    signedIn: null,
    accessEnded: null,
    wrongPair: { text: t("signIn.wrongPair"), untilEdit: true },
    rateLimited: { text: t("errors.rateLimited") },
    failed: { text: t("errors.internalError") },
    unreachable: { text: unreachableText },
  };
  const submit = ({ email, password }: Credentials) => {
    refuse(null);
    signIn.mutate(
      { email: email.trim(), password },
      { onSuccess: (outcome) => refuse(refusals[outcome]) },
    );
  };

  return (
    <AccessPage teaser>
      <Form<Credentials>
        className="contents"
        onInput={edited}
        onFormSubmit={submit}
      >
        <StepFlow.Body>
          <StepFlow.Question>{t("signIn.question")}</StepFlow.Question>
          <StepFlow.Description>{t("signIn.description")}</StepFlow.Description>
          <EmailField />
          <CurrentPasswordField />
          <FormError>{formError}</FormError>
          <OtherWays />
        </StepFlow.Body>
        <StepFlow.Actions>
          <StepFlow.MainButton
            type="submit"
            loading={signIn.isPending}
            loadingLabel={t("signIn.loading")}
          >
            {t("signIn.action")}
          </StepFlow.MainButton>
        </StepFlow.Actions>
      </Form>
    </AccessPage>
  );
}
