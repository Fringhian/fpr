import type { Id } from "@fpr/contracts";
import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactElement } from "react";
import type { RecordSearch } from "../../../lib/record-search";
import { useSession } from "../../../lib/session/use-session";

/** A link into Record a change, opened at `search`, as a `render` takes it. */
export type RecordLink = (search?: RecordSearch) => ReactElement;

/**
 * Record a change for `userId`'s portfolio, opened at a search: the viewer's
 * own Record a change, or the admin's for a member. `link` gives the router's
 * link, `open` goes there, with `replace` in place of the page shown.
 */
export function useRecord(userId: Id): {
  link: RecordLink;
  open: (search?: RecordSearch, options?: { replace?: boolean }) => void;
} {
  const { person } = useSession();
  const navigate = useNavigate();

  const own = userId === person.id;
  return {
    link: (search = {}) =>
      own ? (
        <Link to="/portfolio/record" search={search} />
      ) : (
        <Link
          to="/members/$userId/record"
          params={{ userId }}
          search={search}
        />
      ),
    open: (search = {}, { replace = false } = {}) =>
      void (own
        ? navigate({ to: "/portfolio/record", search, replace })
        : navigate({
            to: "/members/$userId/record",
            params: { userId },
            search,
            replace,
          })),
  };
}
