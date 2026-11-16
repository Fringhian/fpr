import { Collapsible } from "@base-ui/react/collapsible";
import { DownloadSimpleIcon } from "@phosphor-icons/react/DownloadSimple";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../../components/foundations/icon/icon";
import { install, useInstallWay } from "../../lib/install-app";
import { RowCaret, settingRow } from "./setting-row";

/** “Install the app”, which opens the browser's own prompt. */
function InstallButton() {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={() => void install().catch(() => undefined)}
      className={settingRow}
    >
      {t("settings.install.open")}
      <Icon icon={DownloadSimpleIcon} size="s" className="text-secondary" />
    </button>
  );
}

/** “Install the app”, which opens in place the steps of the browser's menu. */
function InstallSteps({ way }: { way: "ios" | "mac" }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger className={settingRow}>
        {t("settings.install.open")}
        <RowCaret open={open} />
      </Collapsible.Trigger>
      <Collapsible.Panel className="flex flex-col gap-xs pb-m">
        <p className="text-s text-primary">{t(`settings.install.${way}`)}</p>
        {way === "ios" ? (
          <p className="text-xs text-secondary">
            {t("settings.install.signIn")}
          </p>
        ) : null}
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

/**
 * Installs FPR from Settings, in a browser that can: with its own prompt, or
 * with the steps of its menu where it has none. Hidden once FPR runs installed.
 */
export function InstallSetting() {
  const way = useInstallWay();

  if (way === null) return null;
  return way === "prompt" ? <InstallButton /> : <InstallSteps way={way} />;
}
