import { CoinsIcon } from "@phosphor-icons/react/Coins";
import { MinusIcon } from "@phosphor-icons/react/Minus";
import { PencilSimpleIcon } from "@phosphor-icons/react/PencilSimple";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { TagIcon } from "@phosphor-icons/react/Tag";
import type { TFunction } from "i18next";
import type { ComponentProps, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import {
  type Decimal,
  formatDate,
  formatMoney,
  formatQuantity,
  type IsoDate,
  type Timestamp,
} from "../../lib/format";
import { useLanguage } from "../../lib/i18n";
import type { Language } from "../../lib/language";
import { Icon, type IconProps } from "./icon";
import * as Menu from "./menu";

/** Shares added to a holding, or removed from it. */
interface HoldingChange {
  kind: "bought" | "sold";
  /** The share's name: `World Index ETF`. */
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
  /** The cash just before, or `null` for the first cash entry. */
  before: Decimal | null;
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

type Entry = HoldingChange | CashSet | ValueAdded | ValueEdited;

type KeysOf<T> = T extends unknown ? keyof T : never;

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
} as const satisfies Record<TimelineRowKind, IconProps["icon"]>;

interface TimelineRowCommonProps {
  /** The day the change or value is for: a calendar day or a timestamp, written `3 Mar`. */
  date: IsoDate | Timestamp;
  /** The time zone a timestamp's day is read in. The browser's by default. */
  timeZone?: string | undefined;
  /** Adds the year to the date, for a list that spans more than one: `3 Mar 2026`. */
  year?: boolean | undefined;
  /** Who made it, as “by Alex”: on a member's entry the admin made, and on every value. */
  madeBy?: string | undefined;
  /** The icon in the soft circle. By default, the kind's: plus, minus, coins, tag, pencil. */
  icon?: IconProps["icon"] | undefined;
  /** The `Menu.Item`s the ⋯ menu offers, such as Edit and Delete. Without them, the row has no ⋯. */
  actions?: ReactNode;
  /** The icon of the button that opens `actions`, any Phosphor icon. Three dots by default. */
  actionsIcon?: IconProps["icon"] | undefined;
}

type TimelineRowOwnProps = TimelineEntry & TimelineRowCommonProps;

export type TimelineRowProps = TimelineRowOwnProps &
  Omit<ComponentProps<"li">, KeysOf<TimelineRowOwnProps> | "children">;

const ZERO = /^0(?:\.0+)?$/;

/** What happened, and the line under it: the title and the change, before → after. */
function describe(
  entry: Entry,
  t: TFunction,
  language: Language,
): { title: string; change: ReactNode } {
  switch (entry.kind) {
    case "bought":
    case "sold": {
      const quantity = formatQuantity(entry.quantity, language);
      const before = formatQuantity(entry.before, language);
      const after = formatQuantity(entry.after, language);
      const title = t(`timelineRow.${entry.kind}`, {
        quantity,
        share: entry.share,
      });
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
    case "cashSet":
      return {
        title: t("timelineRow.cashSet", {
          amount: formatMoney(entry.amount, language),
        }),
        change:
          entry.before === null
            ? t("timelineRow.firstCash")
            : t("timelineRow.was", {
                before: formatMoney(entry.before, language),
              }),
      };
    case "valueAdded":
      return {
        title: t("timelineRow.valueAdded", {
          price: formatMoney(entry.price, language),
        }),
        change: null,
      };
    case "valueEdited":
      return {
        title: t("timelineRow.valueEdited", {
          price: formatMoney(entry.price, language),
        }),
        change: t("timelineRow.was", {
          before: formatMoney(entry.before, language),
        }),
      };
  }
}

/**
 * One recorded change or value, in a `TimelineList`: the date, the kind's icon
 * in a soft circle, what happened with its before → after under it, who made
 * it when that says something, and the ⋯ menu of the actions passed in.
 */
export function TimelineRow(props: TimelineRowProps) {
  const { t } = useTranslation();
  const language = useLanguage();

  const {
    kind,
    share,
    quantity,
    before,
    after,
    amount,
    price,
    date,
    timeZone,
    year,
    madeBy,
    icon,
    actions,
    actionsIcon,
    className,
    ...rest
  } = props;
  const { title, change } = describe(props, t, language);
  const day = formatDate(date, language, {
    ...(timeZone === undefined ? {} : { timeZone }),
    ...(year === undefined ? {} : { year }),
  });
  const author =
    madeBy === undefined ? null : t("timelineRow.madeBy", { name: madeBy });
  const hasDetail = change !== null || author !== null;

  return (
    <li
      {...rest}
      className={cn(
        "grid items-center gap-[0.75rem] border-b-[1.5px] border-divider py-[0.625rem] font-sans",
        "grid-cols-[3.5rem_auto_minmax(0,1fr)_auto]",
        "tablet:grid-cols-[4rem_auto_minmax(0,1fr)_auto]",
        "desktop:grid-cols-[4rem_auto_minmax(0,1fr)_auto]",
        "last:border-b-0",
        className,
      )}
    >
      <time dateTime={date} className="text-xs text-secondary tabular-nums">
        {day}
      </time>
      <span className="inline-flex size-[1.75rem] items-center justify-center rounded-full bg-highlight text-primary">
        <Icon icon={icon ?? TIMELINE_ICONS[kind]} size="s" />
      </span>
      <span className="grid min-w-0">
        <span className="text-s font-semibold text-primary">{title}</span>
        {hasDetail ? (
          <span className="text-xs text-secondary tabular-nums">
            {change}
            {change !== null && author !== null ? " · " : null}
            {author}
          </span>
        ) : null}
      </span>
      {actions ? (
        <Menu.Root>
          <Menu.MoreTrigger
            subject={t("timelineRow.subject", { title, date: day })}
            icon={actionsIcon}
          />
          <Menu.Popup>{actions}</Menu.Popup>
        </Menu.Root>
      ) : null}
    </li>
  );
}

export type TimelineListProps = ComponentProps<"ol">;

/** The list a page's `TimelineRow`s go in, newest first, each row ruled off from the next. */
export function TimelineList({ className, ...props }: TimelineListProps) {
  return <ol {...props} className={cn("grid", className)} />;
}
