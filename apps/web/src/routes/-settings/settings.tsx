import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/atoms/button/button";
import { Icon } from "../../components/foundations/icon/icon";
import * as Dialog from "../../components/molecules/dialog/dialog";
import { signOut } from "../../lib/session/sign-out";
import { useSession } from "../../lib/session/use-session";
import { LanguageSetting } from "./language-setting";
import { LookSettings } from "./look-settings";
import { NameSetting } from "./name-setting";
import { PasswordSetting } from "./password-setting";
import { settingRow } from "./setting-row";

/** “How FPR works”, which opens the help page and closes Settings. */
function HelpRow({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation();

  return (
    <Link to="/help" onClick={onOpen} className={settingRow}>
      {t("navigation.help")}
      <Icon icon={CaretRightIcon} size="s" className="text-secondary" />
    </Link>
  );
}

/** Sign out, then the reminder that there is nothing to save. */
function Foot() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-m gap-y-s pt-s">
      <Button intent="danger" onClick={() => void signOut()}>
        {t("navigation.signOut")}
      </Button>
      <p className="text-xs text-secondary">{t("settings.saved")}</p>
    </div>
  );
}

/**
 * Settings, from the account menu: a dialog from tablet up, a sheet on phone.
 * A person with a profile changes their picture, colour, name and password;
 * an anonymous viewer, only the language. Each setting is saved as soon as it
 * changes, so there is no Save button.
 */
export function Settings({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { readOnly } = useSession();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Popup>
        <Dialog.Header>
          <Dialog.Title>{t("settings.title")}</Dialog.Title>
          <Dialog.Close />
        </Dialog.Header>
        <div className="flex flex-col gap-l pt-xs">
          {readOnly ? null : <LookSettings />}
          {readOnly ? null : <NameSetting />}
          <LanguageSetting />
        </div>
        <div className="flex flex-col pt-s">
          {readOnly ? null : <PasswordSetting />}
          <HelpRow onOpen={() => onOpenChange(false)} />
        </div>
        <Foot />
      </Dialog.Popup>
    </Dialog.Root>
  );
}
