import type { Me, Role } from "@fpr/contracts";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { sessionQuery } from "./session-query.ts";

/** The signed-in person, as a screen reads them. */
export type Session = {
  person: Me;
  role: Role;
  /** An anonymous viewer: every screen, the admin area included, shows no control that changes anything. */
  readOnly: boolean;
};

/**
 * The signed-in person on a route the guards let in only with a session. The
 * root route has loaded it already, so it never suspends there, and it follows
 * every write that invalidates `me`.
 */
export function useSession(): Session {
  const api = useRouteContext({
    from: "__root__",
    select: (context) => context.api,
  });
  const { data: person } = useSuspenseQuery(sessionQuery(api));

  if (person === null) {
    throw new Error("useSession is for routes that need a session");
  }
  return {
    person,
    role: person.role,
    readOnly: person.role === "anonymous",
  };
}
