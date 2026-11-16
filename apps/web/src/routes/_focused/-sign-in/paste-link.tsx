import { Form } from "@base-ui/react/form";
import { getRouteApi, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import * as Field from "../../../components/molecules/field/field";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { accessKeyIn, useAccessChecks } from "../../../lib/access-checks";
import { AccessPage } from "../-access/access-page";

const route = getRouteApi("/_focused/sign-in");

/**
 * Sign-in's other way in, for an installed app that doesn't share the
 * browser's session: the access link pasted whole, or its key alone, opens
 * as it would in the browser. An anonymous viewer is signed in; a waiting
 * link starts its first-use steps.
 */
export function PasteLink() {
  const { t } = useTranslation();
  const navigate = route.useNavigate();
  const checks = useAccessChecks();

  const open = ({ link }: { link: string }) => {
    const key = accessKeyIn(link);
    if (key !== undefined) {
      void navigate({ to: "/access/$key", params: { key } });
    }
  };

  return (
    <AccessPage
      back={{
        render: (
          <Link to="/sign-in" search={({ step: _step, ...search }) => search} />
        ),
      }}
    >
      <Form<{ link: string }> className="contents" onFormSubmit={open}>
        <StepFlow.Body>
          <StepFlow.Question>{t("pasteLink.question")}</StepFlow.Question>
          <StepFlow.Description>
            {t("pasteLink.description")}
          </StepFlow.Description>
          <Field.Root name="link" validate={checks.accessLink}>
            <Field.Label>{t("pasteLink.label")}</Field.Label>
            {/* Text, not `url`: the browser would refuse a bare key before the check runs. */}
            <Field.Control
              inputMode="url"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <Field.Error />
          </Field.Root>
        </StepFlow.Body>
        <StepFlow.Actions>
          <StepFlow.MainButton type="submit" next>
            {t("pasteLink.action")}
          </StepFlow.MainButton>
        </StepFlow.Actions>
      </Form>
    </AccessPage>
  );
}
