let leaving = false;

/**
 * Loads `href` afresh in place of the app, once the session is over: every
 * cached answer and the rest of the visit's state go with the page, and Back
 * leads nowhere inside the app. No leave guard asks first: unsaved input
 * can't be saved without a session.
 */
export function leaveApp(href: string): void {
  leaving = true;
  window.location.replace(href);
}

/** Whether the page is being replaced because the session is over. */
export function isLeavingApp(): boolean {
  return leaving;
}

/**
 * Where a person whose access ended lands: sign-in, which reads
 * `access=ended` and says "Your access has ended".
 */
export const accessEndedHref = "/sign-in?access=ended";

/**
 * Signs the person out after `401 access_ended`. The API has already deleted
 * every session of theirs.
 */
export function signOutOnAccessEnded(): void {
  leaveApp(accessEndedHref);
}

/**
 * Sends a person whose session expired mid-visit to sign-in, which leads back
 * to the page they were on once they sign in again.
 */
export function signInAgain(): void {
  const { pathname, search, hash } = window.location;
  const here = `${pathname}${search}${hash}`;
  leaveApp(
    here === "/"
      ? "/sign-in"
      : `/sign-in?${new URLSearchParams({ redirect: here })}`,
  );
}
