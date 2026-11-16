import { WarningCircleIcon } from "@phosphor-icons/react/WarningCircle";
import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/atoms/button/button";
import type { PageMessageProps } from "../../components/templates/page-message/page-message";
import { MessagePage } from "./message-page";

/** The message of a load that failed, with Retry: a whole page's, or a screen's under its page bar. */
export function useLoadFailedMessage(onRetry: () => void): PageMessageProps {
  const { t } = useTranslation();

  return {
    icon: WarningCircleIcon,
    title: t("pageStates.loadFailed.title"),
    description: t("pageStates.loadFailed.description"),
    action: (
      <Button intent="primary" onClick={onRetry}>
        {t("pageStates.loadFailed.action")}
      </Button>
    ),
  };
}

/** A page whose load failed, such as the session with no network, with Retry. */
export function LoadFailed() {
  const router = useRouter();

  return (
    <MessagePage {...useLoadFailedMessage(() => void router.invalidate())} />
  );
}
