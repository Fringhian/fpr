import { API_URL } from "../api/api.ts";

/** Better Auth's endpoints the web app calls, outside the contracts, under the API's base URL. */
const authPaths = {
  signIn: "/auth/sign-in/email",
  signOut: "/auth/sign-out",
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

/** How a password sign-in ended. */
export type SignInOutcome =
  | "signedIn"
  | "wrongPair"
  | "rateLimited"
  | "accessEnded"
  | "failed"
  | "unreachable";

async function codeOf(response: Response): Promise<unknown> {
  const body: unknown = await response.json().catch(() => null);
  return typeof body === "object" && body !== null && "code" in body
    ? body.code
    : undefined;
}

/**
 * Signs in with an email and password. Better Auth answers a wrong pair the
 * same whatever the person's access, `access_ended` only to the right
 * password of a person whose access ended, and `429` once the client address
 * has used its attempts.
 */
export async function signInWithPassword(credentials: {
  email: string;
  password: string;
}): Promise<SignInOutcome> {
  const response = await postToAuth("signIn", credentials).catch(() => null);
  if (response === null) {
    return "unreachable";
  }
  if (response.ok) {
    return "signedIn";
  }
  if (response.status === 429) {
    return "rateLimited";
  }
  if ((await codeOf(response)) === "access_ended") {
    return "accessEnded";
  }
  return response.status === 400 || response.status === 401
    ? "wrongPair"
    : "failed";
}
