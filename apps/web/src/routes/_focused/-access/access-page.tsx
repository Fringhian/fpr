import type { ReactNode } from "react";
import { Brand } from "../../../components/atoms/brand/brand";
import type { StepProgressProps } from "../../../components/atoms/step-progress/step-progress";
import { LanguageSwitch } from "../../../components/molecules/language-switch/language-switch";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { useLanguage } from "../../../lib/i18n";
import type { IconLinkProps } from "../../../lib/icon-link";
import { useChangeLanguage } from "../../../lib/language-choice";
import { RacePanel, RaceTeaser } from "./made-up-race-places";

/** The switch to FPR's other language, kept on the device. */
function DeviceLanguageSwitch() {
  const language = useLanguage();
  const changeLanguage = useChangeLanguage();

  return (
    <LanguageSwitch
      value={language}
      onValueChange={(language) => void changeLanguage(language)}
      className="ms-auto"
    />
  );
}

/**
 * A page that gets a person in, before any session: sign-in, a password
 * reset, the first-admin setup. The header holds `back`, else FPR's name, and
 * the language switch; then the progress, the step itself, a form holding the
 * body and the main button, and on desktop the made-up race on the sky.
 * `teaser` shows that race above the step on tablet too.
 */
export function AccessPage({
  back,
  progress,
  teaser = false,
  children,
}: {
  back?: IconLinkProps | null | undefined;
  progress?: Pick<StepProgressProps, "step" | "count"> | null | undefined;
  teaser?: boolean;
  children: ReactNode;
}) {
  return (
    <StepFlow.Root>
      <StepFlow.Column>
        <StepFlow.Header>
          {back ? <StepFlow.Back {...back} /> : <Brand />}
          <DeviceLanguageSwitch />
        </StepFlow.Header>
        {progress ? <StepFlow.Progress {...progress} /> : null}
        {teaser ? <RaceTeaser /> : null}
        {children}
      </StepFlow.Column>
      <StepFlow.Panel>
        <RacePanel />
      </StepFlow.Panel>
    </StepFlow.Root>
  );
}
