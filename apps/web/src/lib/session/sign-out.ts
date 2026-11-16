import { postToAuth } from "./better-auth.ts";
import { leaveApp } from "./session-ended.ts";

/**
 * Ends the session with Better Auth, then loads sign-in afresh, so nothing of
 * the person stays on a shared device. A sign-out the API never answered
 * leaves the person signed in, and sign-in then leads them Home.
 */
export async function signOut(): Promise<void> {
  await postToAuth("signOut", {}).catch(() => undefined);
  leaveApp("/sign-in");
}
