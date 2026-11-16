import { useEffect, useRef, useSyncExternalStore } from "react";
import { Trans } from "react-i18next";
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
 * The toast of a new version, kept until Reload or Dismiss. Its texts follow
 * a change of language while it shows.
 */
export const updateToast = {
  title: <Trans i18nKey="toast.update" />,
  action: <Trans i18nKey="toast.reload" />,
  timeout: 0,
};

/**
 * “A new version of FPR is ready” with Reload, once per waiting version: a
 * dismissed toast stays gone until a newer version waits. The app never
 * reloads by itself.
 */
export function UpdatePrompt() {
  const toast = useToast();
  const apply = useSyncExternalStore(subscribe, () => reload);
  const offered = useRef<{ apply: () => void; id: string } | null>(null);

  useEffect(() => {
    if (apply === null || apply === offered.current?.apply) return;
    if (offered.current) toast.close(offered.current.id);
    offered.current = {
      apply,
      id: toast.offer({ ...updateToast, onAction: apply }),
    };
  }, [apply, toast]);

  return null;
}
