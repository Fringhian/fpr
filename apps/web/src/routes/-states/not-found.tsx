import { QuestionIcon } from "@phosphor-icons/react/Question";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/atoms/button/button";
import {
  PageMessage,
  type PageMessageProps,
} from "../../components/templates/page-message/page-message";
import { Screen } from "../-shell/screen";
import { MessagePage } from "./message-page";

function useNotFound(): PageMessageProps {
  const { t } = useTranslation();

  return {
    icon: QuestionIcon,
    title: t("pageStates.notFound.title"),
    description: t("pageStates.notFound.description"),
    action: (
      <Button intent="primary" nativeButton={false} render={<Link to="/" />}>
        {t("pageStates.notFound.action")}
      </Button>
    ),
  };
}

/** The page of an address no route answers, on its own, with the way Home. */
export function NotFound() {
  return <MessagePage {...useNotFound()} />;
}

/** The same page inside the app shell, for a signed-in person. */
export function AppNotFound() {
  return (
    <Screen>
      <PageMessage {...useNotFound()} />
    </Screen>
  );
}
