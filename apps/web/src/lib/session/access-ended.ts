/**
 * Where a person whose access ended lands: sign-in, which reads
 * `access=ended` and says "Your access has ended".
 */
export const accessEndedHref = "/sign-in?access=ended";

/**
 * Signs the person out after `401 access_ended`. The API has already deleted
 * every session of theirs; loading sign-in afresh drops every cached answer
 * and the rest of the visit's state, and leaves nothing to go back to.
 */
export function signOutOnAccessEnded(): void {
  window.location.replace(accessEndedHref);
}
