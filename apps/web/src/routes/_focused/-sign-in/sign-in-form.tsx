import { Form } from "@base-ui/react/form";
import { getRouteApi, Link } from "@tanstack/react-router";
import { Trans, useTranslation } from "react-i18next";
import { TextLink } from "../../../components/atoms/text-link/text-link";
import * as Field from "../../../components/molecules/field/field";
import { FormError } from "../../../components/molecules/form-error/form-error";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { useAccessChecks } from "../../../lib/access-checks";
import type { SignInOutcome } from "../../../lib/session/better-auth";
import { AccessPage } from "../-access/access-page";
import { type Refusal, useRefusal } from "../-access/use-refusal";
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
 * says only that they don't match, under the password; too many attempts and
 * a failed call say so under the form.
 */
export function SignInForm() {
  const { t } = useTranslation();
  const { redirect } = route.useSearch();
  const checks = useAccessChecks();
  const { errors, formError, refuse } = useRefusal<"password">();
  const signIn = usePasswordSignIn(redirect);

  const refusals: Record<SignInOutcome, Refusal<"password"> | null> = {
    signedIn: null,
    accessEnded: null,
    wrongPair: { field: "password", text: t("signIn.wrongPair") },
    rateLimited: { text: t("errors.rateLimited") },
    failed: { text: t("errors.internalError") },
    unreachable: { text: t("errors.unreachable") },
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
        errors={errors}
        onFormSubmit={submit}
      >
        <StepFlow.Body>
          <StepFlow.Question>{t("signIn.question")}</StepFlow.Question>
          <StepFlow.Description>{t("signIn.description")}</StepFlow.Description>
          <Field.Root name="email" validate={checks.email}>
            <Field.Label>{t("accessFields.email")}</Field.Label>
            <Field.Control
              type="email"
              autoComplete="email"
              spellCheck={false}
            />
            <Field.Error />
          </Field.Root>
          <Field.Root name="password" validate={checks.password}>
            <Field.Label>{t("accessFields.password")}</Field.Label>
            <Field.Password autoComplete="current-password" />
            <Field.Error />
          </Field.Root>
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
