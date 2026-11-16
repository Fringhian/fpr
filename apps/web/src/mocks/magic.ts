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
