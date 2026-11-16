import { HourglassMediumIcon } from "@phosphor-icons/react/HourglassMedium";
import { TrayIcon } from "@phosphor-icons/react/Tray";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/atoms/button/button";
import { LoadingPlaceholder } from "../../../components/atoms/loading-placeholder/loading-placeholder";
import { StateIcon } from "../../../components/atoms/state-icon/state-icon";
import { FormError } from "../../../components/molecules/form-error/form-error";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { useErrorText } from "../../../lib/api/errors";
import { useApi } from "../../../lib/api/use-api";
import { lookOf } from "../../../lib/look";
import { useSession } from "../../../lib/session/use-session";
import { LookPanel } from "./look-preview";
import { OnboardingPage } from "./onboarding-page";
import { PreparedPortfolio } from "./prepared-portfolio";
import { useGoToStep } from "./steps";

/**
 * Nothing recorded yet: the admin is preparing it, or, for an admin, who
 * prepares their own, it waits for them in Portfolio.
 */
function NoPortfolio({ admin }: { admin: boolean }) {
  const { t } = useTranslation();

  const state = admin ? "empty" : "preparing";

  return (
    <>
      <StateIcon icon={admin ? TrayIcon : HourglassMediumIcon} />
      <StepFlow.Question>
        {t(`onboarding.portfolio.${state}.question`)}
      </StepFlow.Question>
      <StepFlow.Description>
        {t(`onboarding.portfolio.${state}.description`)}
      </StepFlow.Description>
    </>
  );
}

/** The step's body for each state of the portfolio's load. */
function PortfolioBody() {
  const { t } = useTranslation();
  const api = useApi();
  const errorText = useErrorText();
  const { person, role } = useSession();
  const portfolio = useQuery(
    api.portfolio.get.queryOptions({
      input: { userId: person.id, period: "1M" },
    }),
  );

  if (portfolio.data?.firstEntryOn === null) {
    return <NoPortfolio admin={role === "admin"} />;
  }
  return (
    <>
      <StepFlow.Question>
        {t("onboarding.portfolio.question")}
      </StepFlow.Question>
      <StepFlow.Description>
        {t("onboarding.portfolio.description")}
      </StepFlow.Description>
      {portfolio.data ? (
        <PreparedPortfolio
          portfolio={portfolio.data}
          color={lookOf(person).color}
        />
      ) : portfolio.isError ? (
        <>
          <FormError>{errorText(portfolio.error)}</FormError>
          <Button
            type="button"
            size="s"
            className="self-start"
            onClick={() => void portfolio.refetch()}
          >
            {t("onboarding.retry")}
          </Button>
        </>
      ) : (
        <LoadingPlaceholder className="min-h-[7.5rem]" />
      )}
    </>
  );
}

/**
 * Step 3, for the admin and members: the portfolio prepared for them,
 * read-only, to check before they start. It never blocks: the next step is
 * open while it loads or if it fails.
 */
export function PortfolioStep() {
  const { t } = useTranslation();
  const { person } = useSession();
  const goToStep = useGoToStep();

  return (
    <OnboardingPage
      step="portfolio"
      panel={<LookPanel look={lookOf(person)} />}
    >
      <StepFlow.Body>
        <PortfolioBody />
      </StepFlow.Body>
      <StepFlow.Actions>
        <StepFlow.MainButton next onClick={() => void goToStep("welcome")}>
          {t("onboarding.portfolio.action")}
        </StepFlow.MainButton>
      </StepFlow.Actions>
    </OnboardingPage>
  );
}
