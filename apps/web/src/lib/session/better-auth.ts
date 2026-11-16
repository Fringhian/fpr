import { API_URL } from "../api/api.ts";

/** Better Auth's endpoints the web app calls, outside the contracts, under the API's base URL. */
const authPaths = {
  signIn: "/auth/sign-in/email",
  signOut: "/auth/sign-out",
  changePassword: "/auth/change-password",
} as const;

/** A JSON `POST` to one of Better Auth's endpoints. Rejects only when no answer came back. */
export function postToAuth(
  endpoint: keyof typeof authPaths,
  body: Record<string, unknown>,
): Promise<Response> {
  return fetch(`${API_URL}${authPaths[endpoint]}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** What every endpoint's answer can say, before its own refusals. */
type CommonOutcome = "done" | "rateLimited" | "accessEnded" | "unreachable";

/**
 * A `POST` to `endpoint`, read: no answer, success, `429` once the client
 * address has used its attempts, or `access_ended`; else the refusal's
 * status and Better Auth's code, for the endpoint to name.
 */
async function answerOf(
  endpoint: keyof typeof authPaths,
  body: Record<string, unknown>,
): Promise<CommonOutcome | { status: number; code: unknown }> {
  const response = await postToAuth(endpoint, body).catch(() => null);
  if (response === null) return "unreachable";
  if (response.ok) return "done";
  if (response.status === 429) return "rateLimited";
  const answer: unknown = await response.json().catch(() => null);
  const code =
    typeof answer === "object" && answer !== null && "code" in answer
      ? answer.code
      : undefined;
  return code === "access_ended"
    ? "accessEnded"
    : { status: response.status, code };
}

/** How a password sign-in ended. */
export type SignInOutcome =
  | "signedIn"
  | "wrongPair"
  | "rateLimited"
  | "accessEnded"
  | "failed"
  | "unreachable";

/**
 * Signs in with an email and password. Better Auth answers a wrong pair the
 * same whatever the person's access, and `access_ended` only to the right
 * password of a person whose access ended.
 */
export async function signInWithPassword(credentials: {
  email: string;
  password: string;
}): Promise<SignInOutcome> {
  const answer = await answerOf("signIn", credentials);
  if (typeof answer === "string") {
    return answer === "done" ? "signedIn" : answer;
  }
  return answer.status === 400 || answer.status === 401
    ? "wrongPair"
    : "failed";
}

/** How a password change ended. `signedOut`: the session had already expired. */
export type PasswordChangeOutcome =
  | "changed"
  | "wrongPassword"
  | "signedOut"
  | "rateLimited"
  | "accessEnded"
  | "failed"
  | "unreachable";

/**
 * Replaces the signed-in person's password, given their current one. The API
 * ends every other session of theirs, whatever the request asks.
 */
export async function changePassword(passwords: {
  currentPassword: string;
  newPassword: string;
}): Promise<PasswordChangeOutcome> {
  const answer = await answerOf("changePassword", {
    ...passwords,
    revokeOtherSessions: true,
  });
  if (typeof answer === "string") {
    return answer === "done" ? "changed" : answer;
  }
  if (answer.code === "INVALID_PASSWORD") return "wrongPassword";
  return answer.status === 401 ? "signedOut" : "failed";
}
