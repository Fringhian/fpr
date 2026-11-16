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

/** An address inside the app, never another site's: `/shares?q=x`, not `//x`. */
export function appPath(value: unknown): string | undefined {
  return typeof value === "string" && /^\/(?![/\\])/.test(value)
    ? value
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
