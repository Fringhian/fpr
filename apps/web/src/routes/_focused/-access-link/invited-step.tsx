import { useTranslation } from "react-i18next";
import { Card } from "../../../components/atoms/card/card";
import { Picture } from "../../../components/atoms/picture/picture";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { cn } from "../../../lib/cn";
import { memberColor } from "../../../lib/member-color";
import { AccessPage } from "../-access/access-page";
import type { OpenedLink } from "./open-link";

/**
 * First use, step 1: who the link is for, by the picture, name and email the
 * admin's records hold. The photo route takes a session, so before sign-in
 * the picture is the initial on the person's colour.
 */
export function InvitedStep({
  link,
  onNext,
}: {
  link: Extract<OpenedLink, { state: "invited" }>;
  onNext: () => void;
}) {
  const { t } = useTranslation();

  return (
    <AccessPage progress={{ step: 1, count: 2 }}>
      <StepFlow.Body>
        <StepFlow.Question>
          {t("accessLink.invited.question", { name: link.displayName })}
        </StepFlow.Question>
        <StepFlow.Description>
          {t("accessLink.invited.description")}
        </StepFlow.Description>
        <Card className="flex items-center gap-s bg-highlight p-m">
          <Picture
            name={link.displayName}
            color={memberColor(link.color)}
            photo={link.avatarUrl}
            size="s"
            aria-hidden
            className={cn(
              "",
              "size-[1.75rem] text-xs",
              "tablet:size-[1.75rem] tablet:text-xs",
              "desktop:size-[3rem] desktop:text-l",
            )}
          />
          <div className="grid min-w-0 gap-[0.125rem]">
            <p className="font-semibold break-words">{link.displayName}</p>
            <p className="text-s text-secondary break-all">{link.email}</p>
          </div>
        </Card>
      </StepFlow.Body>
      <StepFlow.Actions>
        <StepFlow.MainButton next onClick={onNext}>
          {t("accessLink.invited.action")}
        </StepFlow.MainButton>
      </StepFlow.Actions>
    </AccessPage>
  );
}
