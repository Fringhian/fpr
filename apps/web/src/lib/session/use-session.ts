import type { Me, Role } from "@fpr/contracts";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useApi } from "../api/use-api.ts";
import { mayEnter } from "./access.ts";
import { sessionQuery } from "./session-query.ts";

/** The signed-in person, as a screen reads them. */
export type Session = {
  person: Me;
  role: Role;
  /** An anonymous viewer: every screen, the admin area included, shows no control that changes anything. */
  readOnly: boolean;
  /**
   * A member or the admin, who has a portfolio and changes shares: Buy and
   * Sell, a manual share's values, the lookup. A guest and an anonymous
   * viewer read the same screens without those controls.
   */
  writer: boolean;
};

/**
 * The signed-in person on a route the guards let in only with a session. The
 * root route has loaded it already, so it never suspends there, and it follows
 * every write that invalidates `me`. A session that ends mid-visit keeps the
 * person in the cache while sign-in replaces the page, so the shell never
 * reads `null` here: only a route outside the guards would.
 */
export function useSession(): Session {
  const api = useApi();
  const { data: person } = useSuspenseQuery(sessionQuery(api));

  if (person === null) {
    throw new Error("useSession is for routes that need a session");
  }
  return {
    person,
    role: person.role,
    readOnly: person.role === "anonymous",
    writer: mayEnter("portfolio", person.role),
  };
}
