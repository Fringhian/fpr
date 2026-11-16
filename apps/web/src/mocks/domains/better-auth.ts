import { HttpResponse, http } from "msw";
import { rateLimitedPassword } from "../magic.ts";
import { hasAccess, personOf } from "../store/people.ts";
import { setSession } from "../store/session.ts";
import type { MockPerson, MockStore } from "../store/types.ts";

/** Better Auth's error body: a code and an English message. */
function authError(status: number, code: string, message: string) {
  return HttpResponse.json({ code, message }, { status });
}

function sessionUser(person: MockPerson) {
  return { id: person.id, email: person.email, name: person.displayName };
}

async function bodyOf(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => ({}));
  return typeof body === "object" && body !== null
    ? (body as Record<string, unknown>)
    : {};
}

/**
 * Better Auth's endpoints the web app calls, outside the contracts: password
 * sign-in, sign-out, the session, and a password change.
 */
export function betterAuthHandlers(store: MockStore, origin: string) {
  const at = (path: string) => `${origin}/api/auth${path}`;
  return [
    http.post(at("/sign-in/email"), async ({ request }) => {
      const { email, password } = await bodyOf(request);
      if (password === rateLimitedPassword) {
        return authError(
          429,
          "TOO_MANY_REQUESTS",
          "Too many requests. Please try again later.",
        );
      }
      const person = store.people.find(
        (candidate) => candidate.email === email,
      );
      if (
        person === undefined ||
        person.password === null ||
        person.password !== password
      ) {
        return authError(
          401,
          "INVALID_EMAIL_OR_PASSWORD",
          "Invalid email or password",
        );
      }
      if (!hasAccess(store, person)) {
        return authError(401, "access_ended", "Access has ended");
      }
      setSession(store, person.id);
      return HttpResponse.json({
        redirect: false,
        token: "mock-session",
        user: sessionUser(person),
      });
    }),

    http.post(at("/sign-out"), () => {
      setSession(store, null);
      return HttpResponse.json({ success: true });
    }),

    http.get(at("/get-session"), () => {
      const person =
        store.session === null ? undefined : personOf(store, store.session);
      return HttpResponse.json(
        person === undefined
          ? null
          : { session: { userId: person.id }, user: sessionUser(person) },
      );
    }),

    http.post(at("/change-password"), async ({ request }) => {
      const person =
        store.session === null ? undefined : personOf(store, store.session);
      if (person === undefined) {
        return authError(401, "UNAUTHORIZED", "Unauthorized");
      }
      if (person.role === "anonymous") {
        return authError(
          403,
          "forbidden",
          "Anonymous viewers have no password",
        );
      }
      const { currentPassword, newPassword } = await bodyOf(request);
      if (
        currentPassword !== person.password ||
        typeof newPassword !== "string"
      ) {
        return authError(400, "INVALID_PASSWORD", "Invalid password");
      }
      person.password = newPassword;
      return HttpResponse.json({ token: null, user: sessionUser(person) });
    }),
  ];
}
