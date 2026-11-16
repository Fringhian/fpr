import type { Me, Role } from "@fpr/contracts";
import {
  adminAreaRoles,
  adminRoles,
  roles,
  writerRoles,
} from "@fpr/contracts/values";

/**
 * Who may enter each group of routes, which a route names in its
 * `staticData.access`: the roles that may, or `signedOut` for the pages that
 * start a session, or `onboarding` for the onboarding steps alone.
 */
export const routeAccess = {
  signedOut: "signedOut",
  onboarding: "onboarding",
  everyone: roles,
  portfolio: writerRoles,
  adminArea: adminAreaRoles,
  admin: adminRoles,
} as const satisfies Record<
  string,
  "signedOut" | "onboarding" | readonly Role[]
>;

export type Access = keyof typeof routeAccess;

/** The groups of routes a list of roles may enter. */
type RoleAccess = {
  [Group in Access]: (typeof routeAccess)[Group] extends readonly Role[]
    ? Group
    : never;
}[Access];

/**
 * Whether `role` may enter the routes of `access`: what the guards check, and
 * what a screen asks before showing a control that leads there or does what
 * they do, such as Buy on a share for `portfolio`.
 */
export function mayEnter(access: RoleAccess, role: Role): boolean {
  return (routeAccess[access] as readonly Role[]).includes(role);
}

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    /** Who may enter the route and its children. A child's own access wins. */
    access?: Access;
  }
}

/** Where a guard sends the visitor instead, with sign-in's search. */
export type GuardTarget =
  | { to: "/" | "/onboarding" }
  | { to: "/sign-in"; search: { redirect?: string } };

/** Characters a browser drops or reads as `/` in an address: `/\t/x` and `/\x` both lead to `//x`. */
const UNSAFE_IN_PATH = /[\\\p{Cc}]/u;

/**
 * An address inside the app, as its path, search and hash, never another
 * site's: `/shares?q=x`, not `//x`. It resolves on this origin as the browser
 * would, and anything with a control character or a backslash is refused.
 */
export function appPath(value: unknown): string | undefined {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    UNSAFE_IN_PATH.test(value)
  ) {
    return undefined;
  }
  const { origin } = window.location;
  const url = new URL(value, origin);
  return url.origin === origin
    ? `${url.pathname}${url.search}${url.hash}`
    : undefined;
}

/** Anonymous viewers have no onboarding. */
function needsOnboarding(me: Me): boolean {
  return !me.onboarded && me.role !== "anonymous";
}

/**
 * Where the guard sends a visitor to a route with this access, or nothing
 * when they may enter. Signed out, every other page leads to sign-in, which
 * leads back to `href` once signed in. Signed in, the pages that start a
 * session lead Home. Until onboarding is finished, every other page leads to
 * it. A role a group doesn't list goes Home.
 */
export function guard({
  access,
  me,
  href,
}: {
  access: Access | undefined;
  me: Me | null;
  /** The address asked for. */
  href: string;
}): GuardTarget | undefined {
  if (access === undefined) {
    return undefined;
  }
  const rule = routeAccess[access];
  if (rule === "signedOut") {
    return me === null ? undefined : { to: "/" };
  }
  if (me === null) {
    return { to: "/sign-in", search: href === "/" ? {} : { redirect: href } };
  }
  if (rule === "onboarding") {
    return needsOnboarding(me) ? undefined : { to: "/" };
  }
  if (needsOnboarding(me)) {
    return { to: "/onboarding" };
  }
  return (rule as readonly Role[]).includes(me.role) ? undefined : { to: "/" };
}
