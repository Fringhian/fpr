import type { ReactNode } from "react";
import { Brand } from "../../../components/atoms/brand/brand";
import type { StepProgressProps } from "../../../components/atoms/step-progress/step-progress";
import { LanguageSwitch } from "../../../components/molecules/language-switch/language-switch";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { useLanguage } from "../../../lib/i18n";
import type { IconLinkProps } from "../../../lib/icon-link";
import { useChangeLanguage } from "../../../lib/language-choice";
import { RacePanel, RaceTeaser } from "./made-up-race-places";

/** The switch to FPR's other language, kept on the device and, once signed in, on the account. */
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

export type LanguagePageProps = {
  /** `Back`'s props, top left. Without it, FPR's name stands there. */
  back?: IconLinkProps | null | undefined;
  progress?: Pick<StepProgressProps, "step" | "count"> | null | undefined;
  /** The sky panel's content, on desktop only. */
  panel: ReactNode;
  children: ReactNode;
};

/**
 * A focused page with the language switch: the header holds `back`, else
 * FPR's name, and the switch; then the progress, the step itself, and on
 * desktop `panel` on the sky. The steps that get a person in and onboarding
 * are each one.
 */
export function LanguagePage({
  back,
  progress,
  panel,
  children,
}: LanguagePageProps) {
  return (
    <StepFlow.Root>
      <StepFlow.Column>
        <StepFlow.Header>
          {back ? <StepFlow.Back {...back} /> : <Brand />}
          <DeviceLanguageSwitch />
        </StepFlow.Header>
        {progress ? <StepFlow.Progress {...progress} /> : null}
        {children}
      </StepFlow.Column>
      <StepFlow.Panel>{panel}</StepFlow.Panel>
    </StepFlow.Root>
  );
}

/**
 * A page that gets a person in, before any session: sign-in, a password
 * reset, the first-admin setup, an access link. A form holds the body and
 * the main button, and the desktop shows the made-up race on the sky.
 * `teaser` shows that race above the step on tablet too.
 */
export function AccessPage({
  teaser = false,
  children,
  ...props
}: Omit<LanguagePageProps, "panel"> & { teaser?: boolean }) {
  return (
    <LanguagePage {...props} panel={<RacePanel />}>
      {teaser ? <RaceTeaser /> : null}
      {children}
    </LanguagePage>
  );
}
