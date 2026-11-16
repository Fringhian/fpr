import type { ComponentProps, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formatDate } from "../../../lib/format/date";
import { useLanguage } from "../../../lib/i18n";
import type { IconProps } from "../../foundations/icon/icon";
import {
  describe,
  type KeysOf,
  TIMELINE_ICONS,
  type TimelineEntry,
} from "./timeline-row-entry";
import {
  Actions,
  Day,
  type DayProps,
  Detail,
  Marker,
  Root,
  Text,
  Title,
} from "./timeline-row-parts";

export {
  TIMELINE_ICONS,
  type TimelineEntry,
  type TimelineRowKind,
} from "./timeline-row-entry";
export {
  Actions,
  Day,
  Detail,
  List,
  Marker,
  Root,
  Text,
  Title,
} from "./timeline-row-parts";

export type TimelineRowProps = TimelineEntry &
  Pick<DayProps, "date" | "timeZone" | "year"> & {
    /** Who made it, as “by Alex”: on a member's entry the admin made, and on every value. */
    madeBy?: string | undefined;
    /** The icon in the soft circle. By default, the kind's: plus, minus, arrows, coins, tag, pencil. */
    icon?: IconProps["icon"] | undefined;
    /** The `Menu.Item`s the ⋯ menu offers, such as Edit and Delete. Without them, the row has no ⋯. */
    actions?: ReactNode;
    /** The icon of the button that opens `actions`, any Phosphor icon. Three dots by default. */
    actionsIcon?: IconProps["icon"] | undefined;
  } & Omit<
    ComponentProps<"li">,
    | KeysOf<TimelineEntry>
    | "date"
    | "timeZone"
    | "year"
    | "madeBy"
    | "icon"
    | "actions"
    | "actionsIcon"
    | "children"
  >;

/** What happened, then its before → after and who made it, when they say something. */
function BasicText({
  title,
  change,
  madeBy,
}: {
  title: string;
  change: ReactNode;
  madeBy: string | undefined;
}) {
  const { t } = useTranslation();

  const author =
    madeBy === undefined ? null : t("timelineRow.madeBy", { name: madeBy });

  return (
    <Text>
      <Title>{title}</Title>
      {change !== null || author !== null ? (
        <Detail>
          {change}
          {change !== null && author !== null ? " · " : null}
          {author}
        </Detail>
      ) : null}
    </Text>
  );
}

/**
 * One recorded change or value, in a `List`: the date, the kind's icon in a
 * soft circle, what happened with its before → after under it, who made it
 * when that says something, and the ⋯ menu of the actions passed in.
 */
export function Basic(props: TimelineRowProps) {
  const { t } = useTranslation();
  const language = useLanguage();

  const {
    kind,
    share,
    quantity,
    before,
    after,
    amount,
    weight,
    price,
    date,
    timeZone,
    year,
    madeBy,
    icon,
    actions,
    actionsIcon,
    ...rest
  } = props;
  const { title, change } = describe(props, t, language);
  const day = formatDate(date, language, { timeZone, year });

  return (
    <Root {...rest}>
      <Day date={date} timeZone={timeZone} year={year} />
      <Marker icon={icon ?? TIMELINE_ICONS[kind]} />
      <BasicText title={title} change={change} madeBy={madeBy} />
      {actions ? (
        <Actions
          subject={t("timelineRow.subject", { title, date: day })}
          icon={actionsIcon}
        >
          {actions}
        </Actions>
      ) : null}
    </Root>
  );
}
