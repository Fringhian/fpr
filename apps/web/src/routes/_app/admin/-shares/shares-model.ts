import type { AdminShare, AdminShareGroups } from "@fpr/contracts";
import type { BadgeState } from "../../../../components/atoms/badge/badge";

/** The groups, in the page's order: what needs the admin first. */
export const SHARE_GROUPS = [
  "needsAttention",
  "tracked",
  "manual",
  "notHeld",
] as const satisfies readonly (keyof AdminShareGroups)[];

export type ShareGroup = (typeof SHARE_GROUPS)[number];

/** The one dialog Tracked shares shows at a time, and the share it is for. */
export type ShareDialog = { kind: "makeManual" | "delete"; share: AdminShare };

/**
 * A share's badge in its group: pending until its first price, late once its
 * closes stop, up to date, manual, held before, or never held.
 */
export function badgeOf(group: ShareGroup, share: AdminShare): BadgeState {
  switch (group) {
    case "needsAttention":
      return share.latestPrice === null ? "pricePending" : "priceLate";
    case "tracked":
      return "upToDate";
    case "manual":
      return "manual";
    case "notHeld":
      return share.hasShareChanges ? "heldBefore" : "neverHeld";
  }
}

/**
 * What the admin can do to a share from its row: make a share that needs
 * attention manual, or delete one no share change refers to.
 */
export function actionOf(
  group: ShareGroup,
  share: AdminShare,
): ShareDialog["kind"] | null {
  if (group === "needsAttention") return "makeManual";
  return group === "notHeld" && !share.hasShareChanges ? "delete" : null;
}
