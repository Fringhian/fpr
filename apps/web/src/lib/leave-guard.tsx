import { useBlocker } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import * as ConfirmDialog from "../components/molecules/confirm-dialog/confirm-dialog";
import { isLeavingApp } from "./session/session-ended";

export type LeaveGuardProps = {
  /** The form holds input that isn't saved. */
  when: boolean;
  /** What leaving loses, such as “This change isn’t saved yet.”. Defaults to “What you entered isn’t saved yet.”. */
  description?: ReactNode;
};

/**
 * Asks before leaving a form that holds unsaved input: a confirmation before
 * the app goes to another page, Back included, and the browser's own prompt
 * before the tab closes or reloads. A change of the address's search alone,
 * such as the period, stays on the page and goes through, and so does the
 * page's replacement once the session is over: signing out, or access
 * ending. Rendered by the form, with `when` false once its input is saved.
 */
export function LeaveGuard({ when, description }: LeaveGuardProps) {
  const { t } = useTranslation();
  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) =>
      when && current.pathname !== next.pathname,
    enableBeforeUnload: () => when && !isLeavingApp(),
    withResolver: true,
  });

  return (
    <ConfirmDialog.Basic
      open={blocker.status === "blocked"}
      onOpenChange={(open) => {
        if (!open) blocker.reset?.();
      }}
      title={t("leaveGuard.title")}
      description={description ?? t("leaveGuard.description")}
      cancelLabel={t("leaveGuard.stay")}
      confirmLabel={t("leaveGuard.leave")}
      onConfirm={() => blocker.proceed?.()}
    />
  );
}
