/**
 * Ends the session with Better Auth, then loads sign-in afresh: every cached
 * answer, the session's included, and the rest of the visit's state go with
 * the page, so nothing of the person stays on a shared device and Back leads
 * nowhere inside the app. A sign-out the API never answered leaves the person
 * signed in, and sign-in then leads them Home.
 */
export async function signOut(): Promise<void> {
  await fetch("/api/auth/sign-out", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  }).catch(() => undefined);
  window.location.replace("/sign-in");
}
