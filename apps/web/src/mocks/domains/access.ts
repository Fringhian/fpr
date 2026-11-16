import type { AccessCheckResponse } from "@fpr/contracts";
import {
  mockBootstrapKey,
  mockPassword,
  mockResetKey,
  rateLimitedPrefix,
} from "../magic.ts";
import { mockError } from "../server/errors.ts";
import { mock } from "../server/implementer.ts";
import { keyState } from "../store/access-keys.ts";
import { newPerson } from "../store/people.ts";
import { endSessionsOf, setSession } from "../store/session.ts";
import type { MockPerson, MockStore } from "../store/types.ts";

/** A public write past its rate limit, reached with the documented prefix. */
function limitRate(value: string): void {
  if (value.startsWith(rateLimitedPrefix)) {
    throw mockError("rate_limited");
  }
}

function invalidRequest(field: string) {
  return mockError("invalid_request", {
    issues: [{ path: [field], code: "custom" }],
  });
}

function checkResponse(store: MockStore, key: string): AccessCheckResponse {
  const { state, person } = keyState(store, key);
  if (person === null || state === "unknown") {
    return { state: "unknown" };
  }
  const signsInWith = person.role === "anonymous" ? "link" : "password";
  if (state !== "waiting") {
    return { state, signsInWith };
  }
  if (signsInWith === "link") {
    return { state, signsInWith };
  }
  return {
    state,
    signsInWith,
    email: person.email ?? "",
    displayName: person.displayName,
    color: person.color,
    avatarUrl: null,
    hasPassword: person.password !== null,
  };
}

/** The person a valid email and reset key pair resets, or `invalid_reset_key`. */
function resetTarget(store: MockStore, email: string, key: string): MockPerson {
  const person = store.people.find((candidate) => candidate.email === email);
  const stored = store.resetKeys.get(key);
  const valid =
    key === mockResetKey ||
    (stored !== undefined &&
      !stored.used &&
      stored.expiresAtMs > store.calendar.nowMs &&
      stored.userId === person?.id);
  if (person === undefined || person.role === "anonymous" || !valid) {
    throw mockError("invalid_reset_key");
  }
  return person;
}

/** The public routes: setup, access links, and password reset. */
export const accessRoutes = {
  setupStatus: mock.access.setupStatus.handler(({ context }) => ({
    adminExists: context.store.people.some((person) => person.role === "admin"),
  })),

  setup: mock.access.setup.handler(({ context, input }) => {
    const { store } = context;
    limitRate(input.email);
    if (store.people.some((person) => person.role === "admin")) {
      throw mockError("admin_exists");
    }
    if (input.bootstrapKey !== mockBootstrapKey) {
      throw mockError("invalid_bootstrap_key");
    }
    const admin = newPerson(store, {
      displayName: input.displayName,
      email: input.email,
      role: "admin",
      accessUntilMs: null,
      password: input.password,
      keyClaimed: true,
    });
    setSession(store, admin.id);
  }),

  check: mock.access.check.handler(({ context, input }) => {
    limitRate(input.key);
    return checkResponse(context.store, input.key);
  }),

  claim: mock.access.claim.handler(({ context, input }) => {
    const { store } = context;
    limitRate(input.key);
    const { state, person } = keyState(store, input.key);
    if (person === null || state !== "waiting" || person.role === "anonymous") {
      throw mockError("invalid_access_key", { state });
    }
    const hasPassword = person.password !== null;
    if (hasPassword === (input.password !== undefined)) {
      throw invalidRequest("password");
    }
    person.keyClaimed = true;
    if (hasPassword) {
      return { signedIn: false };
    }
    person.password = input.password ?? mockPassword;
    setSession(store, person.id);
    return { signedIn: true };
  }),

  signIn: mock.access.signIn.handler(({ context, input }) => {
    const { store } = context;
    limitRate(input.key);
    const { state, person } = keyState(store, input.key);
    if (
      person === null ||
      person.role !== "anonymous" ||
      (state !== "waiting" && state !== "claimed")
    ) {
      throw mockError("invalid_access_key", { state });
    }
    person.keyClaimed = true;
    setSession(store, person.id);
  }),

  checkReset: mock.access.checkReset.handler(({ context, input }) => {
    limitRate(input.email);
    resetTarget(context.store, input.email, input.key);
  }),

  reset: mock.access.reset.handler(({ context, input }) => {
    const { store } = context;
    limitRate(input.email);
    const person = resetTarget(store, input.email, input.key);
    person.password = input.password;
    const stored = store.resetKeys.get(input.key);
    if (stored !== undefined) {
      stored.used = true;
    }
    endSessionsOf(store, person.id);
  }),
};
