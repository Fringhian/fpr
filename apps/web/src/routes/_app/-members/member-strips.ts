import type { Id, Language, Members } from "@fpr/contracts";
import type * as MemberStrip from "../../../components/organisms/member-strip/member-strip";
import type { GainUnit } from "../../../lib/gain";
import { INTL_LOCALE } from "../../../lib/language";
import { lookOf } from "../../../lib/look";
import { gainPoints } from "../../../lib/series";

type Member = Members["members"][number];

/** A strip as the list draws it, without the link, which the screen adds. */
export type StripData = Omit<MemberStrip.BasicProps, "link"> & { id: Id };

/** The viewer first, then everyone by the name shown, whatever the period. */
function inOrder(
  members: readonly Member[],
  viewerId: Id,
  language: Language,
): Member[] {
  const collator = new Intl.Collator(INTL_LOCALE[language]);
  return members.toSorted((a, b) => {
    if (a.member.id === viewerId) return -1;
    if (b.member.id === viewerId) return 1;
    return collator.compare(a.member.displayName, b.member.displayName);
  });
}

/**
 * The Members list's strips: the viewer's own first, tinted, then everyone
 * else alphabetically, each with the viewer's curve faded behind theirs when
 * the viewer is in the race.
 */
export function memberStrips(
  members: readonly Member[],
  {
    viewerId,
    unit,
    language,
  }: { viewerId: Id; unit: GainUnit; language: Language },
): StripData[] {
  const viewer = members.find(({ member }) => member.id === viewerId);
  const yours =
    viewer?.firstEntryOn == null ? undefined : gainPoints(viewer.series, unit);

  return inOrder(members, viewerId, language).map((row) => {
    const you = row.member.id === viewerId;
    return {
      id: row.member.id,
      ...lookOf(row.member),
      you,
      since: row.firstEntryOn,
      incomplete: row.incomplete,
      points: gainPoints(row.series, unit),
      yours: you ? undefined : yours,
      gain: row.gain,
      unit,
      balanceEur: row.balanceEur,
      holdings: row.topHoldings.map(({ share, weight }) => ({
        id: share.id,
        name: share.name,
        weight,
      })),
      holdingCount: row.holdingCount,
    };
  });
}
