import { API_URL } from "../api/api.ts";
import { leaveApp } from "./session-ended.ts";

/**
 * Ends the session with Better Auth, then loads sign-in afresh, so nothing of
 * the person stays on a shared device. A sign-out the API never answered
 * leaves the person signed in, and sign-in then leads them Home.
 */
export async function signOut(): Promise<void> {
  await fetch(`${API_URL}/auth/sign-out`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  }).catch(() => undefined);
  leaveApp("/sign-in");
}
