import type { Language, Me } from "@fpr/contracts";
import { languages, profileRoles } from "@fpr/contracts/values";
import { MutationObserver, type QueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import type { i18n as I18n } from "i18next";
import { useCallback } from "react";
import type { Api } from "./api/api.ts";
import { DEFAULT_LANGUAGE } from "./language.ts";
import { oneOf } from "./one-of.ts";
import { sessionQuery } from "./session/session-query.ts";

const KEY = "fpr.language.v1";

/** The language picked on this device, or nothing when none is kept or storage can't be read. */
function readKeptLanguage(): Language | undefined {
  try {
    return oneOf(languages, window.localStorage.getItem(KEY));
  } catch {
    return undefined;
  }
}

function keepLanguage(language: Language): void {
  try {
    window.localStorage.setItem(KEY, language);
  } catch {
    // Private browsing or a full storage: the language lasts until the page reloads.
  }
}

/**
 * The language FPR shows, whatever the browser's: the signed-in person's own
 * pick, else the one picked on this device, before sign-in included, else
 * French.
 */
export function languageOf(me: Me | null): Language {
  return me?.language ?? readKeptLanguage() ?? DEFAULT_LANGUAGE;
}

/**
 * Shows the session's language, read before every route loads. The person's
 * own pick is kept on the device too, so the pages after sign-out stay in it.
 */
export async function followSessionLanguage(
  i18n: I18n,
  me: Me | null,
): Promise<void> {
  const language = languageOf(me);
  if (me?.language) {
    keepLanguage(language);
  }
  if (i18n.language !== language) {
    await i18n.changeLanguage(language);
  }
}

/**
 * Switches FPR to `language` at once and keeps it on the device. A person who
 * has a profile also keeps it on their account, so it follows them to every
 * device: the session shows it at once, and a refused save puts the previous
 * language back and rejects. An anonymous viewer's pick stays on the device.
 */
export async function changeLanguage(
  language: Language,
  context: { i18n: I18n; queryClient: QueryClient; api: Api },
): Promise<void> {
  const { i18n, queryClient, api } = context;
  const { queryKey } = sessionQuery(api);
  const me = queryClient.getQueryData(queryKey) ?? null;
  const previous = languageOf(me);

  keepLanguage(language);
  await i18n.changeLanguage(language);
  if (me === null || !(profileRoles as readonly string[]).includes(me.role)) {
    return;
  }
  // The session shows the pick before the save answers, so a navigation in
  // between doesn't switch back to the language the account had.
  const picked: Me = { ...me, language };
  queryClient.setQueryData(queryKey, picked);
  try {
    await new MutationObserver(
      queryClient,
      api.me.update.mutationOptions(),
    ).mutate({ language });
  } catch (error) {
    queryClient.setQueryData(queryKey, me);
    keepLanguage(previous);
    await i18n.changeLanguage(previous);
    throw error;
  }
}

/**
 * `changeLanguage` for a screen: the language switch of the sign-in and
 * onboarding steps, and Settings.
 */
export function useChangeLanguage(): (language: Language) => Promise<void> {
  const context = useRouteContext({ from: "__root__" });

  return useCallback(
    (language) => changeLanguage(language, context),
    [context],
  );
}
