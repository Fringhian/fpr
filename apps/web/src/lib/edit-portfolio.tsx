import type { Id } from "@fpr/contracts";
import { Link, type SearchSchemaInput } from "@tanstack/react-router";
import type { ReactElement } from "react";

/**
 * A member's page's search: `edit`, the admin's edit mode, written `?edit=true`
 * (`?edit=1` reads the same). Left out otherwise.
 */
export function validateMemberSearch(
  search: { edit?: true | 1 | undefined } & SearchSchemaInput,
): { edit?: true | undefined } {
  const edit: unknown = search.edit;
  return {
    edit: edit === true || edit === 1 || edit === "1" ? true : undefined,
  };
}

/**
 * The router's link to `userId`'s page in edit mode, as a `render` takes it:
 * the member page's Edit portfolio, Done in Record a change for a member, and
 * the People page's offer to prepare a new member's portfolio.
 */
export function editPortfolioLink(userId: Id): ReactElement {
  return (
    <Link to="/members/$userId" params={{ userId }} search={{ edit: true }} />
  );
}
