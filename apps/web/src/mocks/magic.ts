/**
 * The inputs that reach each answer of the mock API, error paths included.
 * The role switch lists the access links.
 */

/** An access key from a readable label, padded to the 43 characters of a real one. */
function accessKey(label: string): string {
  return label.padEnd(43, "_");
}

/** Every password user of the fixtures signs in with it. */
export const mockPassword = "mock password";

/** `POST /api/auth/sign-in/email` with this password answers `429`. */
export const rateLimitedPassword = "rate limited password";

/** `POST /setup` accepts this key while no admin exists. */
export const mockBootstrapKey = "mock-bootstrap-key";

/** `POST /password-reset/check` accepts this key with any password user's email. */
export const mockResetKey = "mock-reset-key";

/** `POST /shares/lookup` answers these queries with these errors. */
export const lookupErrors = {
  budget: "call_budget_used",
  offline: "provider_unavailable",
} as const;

/**
 * `POST /admin/prices/refresh` runs this many times, then answers
 * `call_budget_used`, as once the day's call cap is reached. A refresh takes
 * `refreshMs`, and another one sent meanwhile answers `refresh_running`.
 */
export const refreshCap = 2;
export const refreshMs = 1200;

/**
 * The address switches of `pnpm dev:mock`, each read once on load and removed
 * from the address, lasting until the next load: `?mock-as=<persona>` signs
 * in as a persona, `?mock-empty` starts with nobody yet, `?mock-slow` (or
 * `?mock-slow=<ms>`) delays every answer, and `?mock-fail=<path>` answers
 * `500 internal_error` to every route whose path starts with it, such as
 * `?mock-fail=/race` or `?mock-fail=/leaderboards`, and `?mock-conflict`
 * has another member change each manual value just before its first edit or
 * deletion, as two people editing it at once.
 */
export const urlSwitches = {
  persona: "mock-as",
  empty: "mock-empty",
  slow: "mock-slow",
  fail: "mock-fail",
  conflict: "mock-conflict",
} as const;

/** How long `?mock-slow` delays every answer when it names no time, in milliseconds. */
export const slowDelayMs = 3000;

/** Any public write whose key or email starts with this answers `429 rate_limited`. */
export const rateLimitedPrefix = "rate-limited";

/**
 * An access key in each state, with the person it belongs to, by fixture
 * key. Any other well-formed key is `unknown`.
 */
export const accessKeys = {
  waiting: { key: accessKey("waiting-invite"), person: "camille" },
  waitingWithPassword: {
    key: accessKey("waiting-replaced-link"),
    person: "ines",
  },
  anonymous: { key: accessKey("anonymous-viewer"), person: "viewer" },
  claimed: { key: accessKey("claimed-member"), person: "sam" },
  expired: { key: accessKey("expired-invite"), person: "dominique" },
  replaced: { key: accessKey("replaced-link"), person: "robin" },
  revoked: { key: accessKey("revoked-member"), person: "eden" },
  ended: { key: accessKey("ended-member"), person: "sacha" },
  rateLimited: { key: accessKey(rateLimitedPrefix), person: null },
} as const;
