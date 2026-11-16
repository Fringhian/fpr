import {
  type CurrentPosition,
  type Db,
  type Share,
  type ShareValue,
  shareLists,
  shareValues,
} from "@fpr/db";
import { Big } from "./decimal.js";

/** A holding above zero now, valued at its share's latest price. */
export interface HoldingNow {
  userId: string;
  share: Share;
  quantity: Big;
  /** The latest price, `undefined` while the share has none. */
  value: ShareValue | undefined;
  /** `null` while the share has no price. */
  valueEur: Big | null;
}

/** Holdings above zero now, each valued at its share's latest price, largest first. */
export async function holdingsNow(
  db: Db,
  positions: readonly CurrentPosition[],
): Promise<HoldingNow[]> {
  const ids = [...new Set(positions.map(({ shareId }) => shareId))];
  const [shares, values] = await Promise.all([
    shareLists.byIds(db, ids),
    shareValues.valuesAt(db, ids),
  ]);
  return positions
    .flatMap(({ userId, shareId, quantity }) => {
      const share = shares.get(shareId);
      if (share === undefined) {
        return [];
      }
      const value = values.get(shareId);
      const held = new Big(quantity);
      return [
        {
          userId,
          share,
          quantity: held,
          value,
          valueEur: value === undefined ? null : held.times(value.priceEur),
        },
      ];
    })
    .sort(
      (a, b) =>
        (b.valueEur ?? new Big(-1)).cmp(a.valueEur ?? new Big(-1)) ||
        a.share.name.localeCompare(b.share.name),
    );
}
