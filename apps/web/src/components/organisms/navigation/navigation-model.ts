import type { PictureProps } from "../../atoms/picture/picture";

/** Who is signed in: it decides which items the navigation shows. */
export type Role = "admin" | "member" | "guest" | "anonymous";

/** A page the navigation has an item for. */
export type Destination =
  | "home"
  | "members"
  | "portfolio"
  | "shares"
  | "people"
  | "trackedShares";

/** A page the navigation links to: its items, and How FPR works in the account menu. */
export type LinkTarget = Destination | "help";

export const HREFS = {
  home: "/",
  members: "/members",
  portfolio: "/portfolio",
  shares: "/shares",
  people: "/admin/people",
  trackedShares: "/admin/shares",
  help: "/help",
} as const satisfies Record<LinkTarget, string>;

/** What `renderLink` receives for each link. */
export interface NavigationLink {
  target: LinkTarget;
  href: (typeof HREFS)[LinkTarget];
}

/** The signed-in person, as their picture shows them. */
export type Account = Pick<PictureProps, "name" | "color" | "photo">;

/**
 * The items a role sees: the four main ones, without Portfolio for guests and
 * anonymous viewers, then the admin area for the admin, and for anonymous
 * viewers, who read it without changing anything.
 */
export function destinationsFor(role: Role): {
  main: readonly Destination[];
  admin: readonly Destination[];
} {
  const portfolio = role === "admin" || role === "member";
  const adminArea = role === "admin" || role === "anonymous";
  return {
    main: portfolio
      ? ["home", "members", "portfolio", "shares"]
      : ["home", "members", "shares"],
    admin: adminArea ? ["people", "trackedShares"] : [],
  };
}
