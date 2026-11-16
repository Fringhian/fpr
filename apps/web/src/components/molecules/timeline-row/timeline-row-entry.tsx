import type { Decimal, Language } from "@fpr/contracts";
import { CoinsIcon } from "@phosphor-icons/react/Coins";
import { MinusIcon } from "@phosphor-icons/react/Minus";
import { PencilSimpleIcon } from "@phosphor-icons/react/PencilSimple";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { TagIcon } from "@phosphor-icons/react/Tag";
import { TrashIcon } from "@phosphor-icons/react/Trash";
import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { formatMoney } from "../../../lib/format/money";
import { formatQuantity } from "../../../lib/format/number";
import { entryTitle } from "../../../lib/log-entry";
import type { IconProps } from "../../foundations/icon/icon";

/** Shares added to a holding, or removed from it. */
interface HoldingChange {
  kind: "bought" | "sold";
  share: string;
  /** The units bought or sold, above zero, with the decimals they were entered with. */
  quantity: Decimal;
  /** The units held just before. `0` on a purchase reads “New holding”. */
  before: Decimal;
  /** The units held just after. */
  after: Decimal;
}

/** A cash balance: “from this day, I have €2,000”. */
interface CashSet {
  kind: "cashSet";
  /** The cash from that moment, in euros. */
  amount: Decimal;
  /** The cash just before, `null` for the first cash entry, or `undefined` when it isn't known yet, such as an older page of a log not loaded: no line then. */
  before?: Decimal | null | undefined;
}

/** A value point added to a manual share: what one unit was worth. */
interface ValueAdded {
  kind: "valueAdded";
  /** The value of one unit, in euros. */
  price: Decimal;
}

/** A value point of a manual share changed to another value. */
interface ValueEdited {
  kind: "valueEdited";
  /** The new value of one unit, in euros. */
  price: Decimal;
  /** The value it had before, in euros. */
  before: Decimal;
}

/** A value point of a manual share deleted. */
interface ValueDeleted {
  kind: "valueDeleted";
  /** The value it had, in euros. */
  before: Decimal;
}

type Entry = HoldingChange | CashSet | ValueAdded | ValueEdited | ValueDeleted;

export type KeysOf<T> = T extends unknown ? keyof T : never;

/** Each kind with the other kinds' fields set to `never`, so one entry never mixes two kinds. */
type Exclusive<T, All = T> = T extends unknown
  ? T & Partial<Record<Exclude<KeysOf<All>, keyof T>, never>>
  : never;

/** What the row records, told apart by `kind`. */
export type TimelineEntry = Exclusive<Entry>;

export type TimelineRowKind = Entry["kind"];

/** The icon each kind draws unless `icon` says otherwise. */
export const TIMELINE_ICONS = {
  bought: PlusIcon,
  sold: MinusIcon,
  cashSet: CoinsIcon,
  valueAdded: TagIcon,
  valueEdited: PencilSimpleIcon,
  valueDeleted: TrashIcon,
} as const satisfies Record<TimelineRowKind, IconProps["icon"]>;

/** What an entry says: its title, and the line under it, before → after or `null`. */
interface Description {
  title: string;
  change: ReactNode;
}

const ZERO = /^0(?:\.0+)?$/;

function describeHolding(
  entry: HoldingChange,
  t: TFunction,
  language: Language,
): Description {
  const before = formatQuantity(entry.before, language);
  const after = formatQuantity(entry.after, language);
  const title = entryTitle(entry, t, language);
  if (entry.kind === "bought" && ZERO.test(entry.before)) {
    return { title, change: t("timelineRow.newHolding") };
  }
  return {
    title,
    change: (
      <>
        <span aria-hidden="true">
          {t("timelineRow.held", { before, after })}
        </span>
        <span className="sr-only">
          {t("timelineRow.heldSpoken", { before, after })}
        </span>
      </>
    ),
  };
}

/** What happened, and the line under it: the title and the change, before → after. */
export function describe(
  entry: Entry,
  t: TFunction,
  language: Language,
): Description {
  const money = (amount: Decimal) => formatMoney(amount, language);
  switch (entry.kind) {
    case "bought":
    case "sold":
      return describeHolding(entry, t, language);
    case "cashSet":
      return {
        title: entryTitle(entry, t, language),
        change:
          entry.before === undefined
            ? null
            : entry.before === null
              ? t("timelineRow.firstCash")
              : t("timelineRow.was", { before: money(entry.before) }),
      };
    case "valueAdded":
      return {
        title: t("timelineRow.valueAdded", { price: money(entry.price) }),
        change: null,
      };
    case "valueEdited":
      return {
        title: t("timelineRow.valueEdited", { price: money(entry.price) }),
        change: t("timelineRow.was", { before: money(entry.before) }),
      };
    case "valueDeleted":
      return {
        title: t("timelineRow.valueDeleted", { price: money(entry.before) }),
        change: null,
      };
  }
}
