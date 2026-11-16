import { CheckCircleIcon } from "@phosphor-icons/react/CheckCircle";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AccessState } from "../-access/access-state";

/** `/setup` once an admin exists, whatever the key: the way is sign-in. */
export function SetupClosed() {
  const { t } = useTranslation();

  return (
    <AccessState
      icon={CheckCircleIcon}
      title={t("setup.closedTitle")}
      description={t("setup.closedDescription")}
      action={{
        nativeButton: false,
        render: <Link to="/sign-in" />,
        children: t("setup.closedAction"),
      }}
    />
  );
}
