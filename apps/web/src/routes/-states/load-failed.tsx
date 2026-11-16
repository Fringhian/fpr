import { WarningCircleIcon } from "@phosphor-icons/react/WarningCircle";
import { WifiSlashIcon } from "@phosphor-icons/react/WifiSlash";
import { useRouter } from "@tanstack/react-router";
import { type ReactNode, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/atoms/button/button";
import type { PageMessageProps } from "../../components/templates/page-message/page-message";
import { MessagePage } from "./message-page";

function onConnectionChange(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * The message of a load that failed, with Retry: a whole page's, or a screen's
 * under its page bar. With no network, every screen says “You’re offline”
 * instead, whatever `title` it gives its own failure.
 */
export function useLoadFailedMessage(
  onRetry: () => void,
  title?: ReactNode,
): PageMessageProps {
  const { t } = useTranslation();
  const offline = useSyncExternalStore(
    onConnectionChange,
    () => !navigator.onLine,
  );

  return {
    icon: offline ? WifiSlashIcon : WarningCircleIcon,
    title: offline
      ? t("pageStates.offline.title")
      : (title ?? t("pageStates.loadFailed.title")),
    description: offline
      ? t("pageStates.offline.description")
      : t("pageStates.loadFailed.description"),
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
