import { useEffect, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "../components/molecules/toast/use-toast";

let reload: (() => void) | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Offers the new version the service worker has installed and keeps waiting:
 * `apply` reloads the page on it, once the person asks.
 */
export function offerUpdate(apply: () => void) {
  reload = apply;
  for (const listener of listeners) listener();
}

/**
 * “A new version of FPR is ready” with Reload, kept until pressed or
 * dismissed, once a new version waits. The app never reloads by itself.
 */
export function UpdatePrompt() {
  const { t } = useTranslation();
  const toast = useToast();
  const apply = useSyncExternalStore(subscribe, () => reload);

  useEffect(() => {
    if (apply === null) return;
    const id = toast.offer({
      title: t("toast.update"),
      action: t("toast.reload"),
      onAction: apply,
      timeout: 0,
    });
    return () => toast.close(id);
  }, [apply, toast, t]);

  return null;
}
