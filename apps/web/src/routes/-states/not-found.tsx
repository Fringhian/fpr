import { QuestionIcon } from "@phosphor-icons/react/Question";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/atoms/button/button";
import { MessagePage } from "./message-page";

/** The page of an address no route answers, with the way Home. */
export function NotFound() {
  const { t } = useTranslation();

  return (
    <MessagePage
      icon={QuestionIcon}
      title={t("pageStates.notFound.title")}
      description={t("pageStates.notFound.description")}
      action={
        <Button intent="primary" nativeButton={false} render={<Link to="/" />}>
          {t("pageStates.notFound.action")}
        </Button>
      }
    />
  );
}
