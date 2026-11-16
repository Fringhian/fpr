import { colorCount } from "@fpr/contracts/values";
import * as Swatch from "../../components/atoms/swatch/swatch";
import { cn } from "../../lib/cn";
import {
  MEMBER_COLORS,
  type MemberColor,
  memberColor,
} from "../../lib/member-color";
import { useOthers } from "./use-others";

/** The others' colours, and whether every colour is taken, so they can be shared. */
export type TakenColours = {
  owners: ReadonlyMap<MemberColor, string>;
  shared: boolean;
};

/**
 * Who has each colour among the others, and whether the ten are all taken
 * with the person's own `color`. Until the members list loads, nothing reads
 * as taken: the API refuses a colour taken meanwhile anyway.
 */
export function useTakenColours(color: MemberColor): {
  taken: TakenColours;
  refresh: () => void;
} {
  const { others, refresh } = useOthers();

  const owners = new Map<MemberColor, string>();
  for (const other of others) {
    const owned = memberColor(other.color);
    if (!owners.has(owned)) {
      owners.set(owned, other.displayName);
    }
  }
  const all = new Set([...owners.keys(), color]);

  return {
    taken: { owners, shared: all.size >= colorCount },
    refresh,
  };
}

/**
 * The ten colours in the theme's order. A colour another person has is
 * faded with their initial and can't be picked, unless all ten are taken.
 */
export function ColourPicker({
  value,
  onValueChange,
  taken,
  labelledBy,
}: {
  value: MemberColor;
  onValueChange: (color: MemberColor) => void;
  taken: TakenColours;
  labelledBy: string;
}) {
  return (
    <Swatch.Group
      aria-labelledby={labelledBy}
      // The ten fit one row of the desktop's 412px column.
      className={cn("", "", "", "desktop:gap-x-[0.625rem]")}
      value={value}
      onValueChange={onValueChange}
    >
      {MEMBER_COLORS.map((color) => {
        const owner = taken.owners.get(color);
        return (
          <Swatch.Item
            key={color}
            color={color}
            takenBy={owner}
            disabled={owner !== undefined && !taken.shared}
          />
        );
      })}
    </Swatch.Group>
  );
}
