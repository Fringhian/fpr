import type { AdminShare, AdminShareGroups } from "@fpr/contracts";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { GroupHeading } from "../-shared/group-heading";
import { ShareList, ShareRow } from "./share-row";
import {
  SHARE_GROUPS,
  type ShareDialog,
  type ShareGroup,
} from "./shares-model";

/** One group: its heading with its count, what FPR does with its shares, then its rows. */
function Group({
  group,
  shares,
  onAct,
}: {
  group: ShareGroup;
  shares: readonly AdminShare[];
  onAct: ((dialog: ShareDialog) => void) | undefined;
}) {
  const { t } = useTranslation();
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-s">
      <GroupHeading
        id={headingId}
        title={t(`adminShares.groups.${group}.title`)}
        count={shares.length}
        description={t(`adminShares.groups.${group}.description`)}
      />
      {shares.length === 0 ? (
        <p className="text-s text-secondary">
          {t(`adminShares.groups.${group}.empty`)}
        </p>
      ) : (
        <ShareList>
          {shares.map((share) => (
            <ShareRow
              key={share.id}
              share={share}
              group={group}
              onAct={onAct}
            />
          ))}
        </ShareList>
      )}
    </section>
  );
}

/**
 * Every share FPR knows, in four groups: needs attention, tracked, manual,
 * not held. Without `onAct`, as an anonymous viewer reads it, rows have no
 * action.
 */
export function ShareGroups({
  groups,
  onAct,
}: {
  groups: AdminShareGroups;
  onAct: ((dialog: ShareDialog) => void) | undefined;
}) {
  return (
    <div className="flex flex-col gap-l pb-l">
      {SHARE_GROUPS.map((group) => (
        <Group key={group} group={group} shares={groups[group]} onAct={onAct} />
      ))}
    </div>
  );
}
