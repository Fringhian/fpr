import { WarningCircleIcon } from "@phosphor-icons/react/WarningCircle";
import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/atoms/button/button";
import { MessagePage } from "./message-page";

/** A page whose load failed, such as the session with no network, with Retry. */
export function LoadFailed() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <MessagePage
      icon={WarningCircleIcon}
      title={t("pageStates.loadFailed.title")}
      description={t("pageStates.loadFailed.description")}
      action={
        <Button intent="primary" onClick={() => void router.invalidate()}>
          {t("pageStates.loadFailed.action")}
        </Button>
      }
    />
  );
}
