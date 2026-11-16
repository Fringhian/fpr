/** Postgres's integrity constraint violations: SQLSTATE class 23. */
const INTEGRITY_CONSTRAINT_VIOLATION = /^23[0-9A-Z]{3}$/;

/**
 * The name of the constraint a failed query violated, such as
 * `shares_isin_key` for a unique column or `portfolio_changes_share_id_fkey`
 * for a foreign key. `undefined` for any other error.
 */
export function violatedConstraint(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const { code, constraint } = error as {
    code?: unknown;
    constraint?: unknown;
  };
  return typeof code === "string" &&
    INTEGRITY_CONSTRAINT_VIOLATION.test(code) &&
    typeof constraint === "string"
    ? constraint
    : undefined;
}
