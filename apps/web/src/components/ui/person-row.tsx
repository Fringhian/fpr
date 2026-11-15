import { DotsThreeIcon } from "@phosphor-icons/react/DotsThree";
import type { ComponentProps, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import { formatDate, type IsoDate, type Timestamp } from "../../lib/format";
import { useLanguage } from "../../lib/i18n";
import type { MemberColor } from "../../lib/member-color";
import { Badge, type BadgeState } from "./badge";
import type { IconProps } from "./icon";
import { IconButton } from "./icon-button";
import * as Menu from "./menu";
import { Picture } from "./picture";

/**
 * Where a person's access stands, as the admin area lists it: waiting for the
 * link's first use, active, expired (never used before its deadline), ended
 * (past its end date), or revoked.
 */
export type AccessStatus =
  | "waiting"
  | "active"
  | "expired"
  | "ended"
  | "revoked";

/** The badge that names each access status. */
const BADGES = {
  waiting: "waitingForFirstUse",
  active: "active",
  expired: "expired",
  ended: "ended",
  revoked: "revoked",
} as const satisfies Record<AccessStatus, BadgeState>;

export type PersonListProps = ComponentProps<"ul">;

/**
 * The list person rows go in. Its columns are shared by every row, so the
 * emails, badges and end dates line up from one row to the next.
 */
export function PersonList({ className, ...props }: PersonListProps) {
  return (
    <ul
      {...props}
      className={cn(
        "m-0 grid list-none gap-x-[0.875rem] gap-y-s p-0 font-sans",
        "grid-cols-[auto_minmax(0,1fr)_auto]",
        "tablet:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto]",
        "desktop:grid-cols-[auto_minmax(0,1fr)_minmax(0,13.75rem)_auto_auto_auto]",
        className,
      )}
    />
  );
}

interface PersonRowOwnProps {
  /** The person's display name, or the pseudonym an anonymous viewer sees in its place. */
  name: string;
  /** The person's colour: their picture sits on its pastel. */
  color: MemberColor;
  /** The photo's URL, or `null` for the initial. An anonymous viewer always receives `null`. */
  photo?: string | null | undefined;
  /** The sign-in email, or `null`: an anonymous viewer has none, and an anonymous viewer reading the list sees none. */
  email: string | null;
  /** Where the person's access stands, named by its badge. */
  status: AccessStatus;
  /** When access ends, as a day or a timestamp, or `null` for no end date. */
  accessUntil: IsoDate | Timestamp | null;
  /** The ⋯ menu's items, as `Menu.Item`s and a `Menu.Separator`. Without them the row has no ⋯, as for an anonymous viewer, who reads the admin area without changing it. */
  actions?: ReactNode;
  /** The ⋯ button's icon, any Phosphor icon. Three dots by default. */
  moreIcon?: IconProps["icon"] | undefined;
}

export type PersonRowProps = PersonRowOwnProps &
  Omit<ComponentProps<"li">, keyof PersonRowOwnProps | "children">;

/**
 * A person in the admin area: picture, name, email, access status, end date,
 * and the ⋯ menu of what the admin can do. It goes in a `PersonList`. On
 * tablet the email moves under the name; on phone the status and end date go
 * under it too.
 */
export function PersonRow({
  name,
  color,
  photo,
  email,
  status,
  accessUntil,
  actions,
  moreIcon = DotsThreeIcon,
  className,
  ...props
}: PersonRowProps) {
  const { t } = useTranslation();
  const language = useLanguage();

  const until =
    accessUntil === null
      ? null
      : t("personRow.until", {
          date: formatDate(accessUntil, language, { year: true }),
        });

  return (
    <li
      {...props}
      className={cn(
        "col-span-full grid grid-cols-subgrid items-center rounded-[1.125rem] bg-surface px-[0.875rem] py-[0.625rem] shadow-outline",
        "gap-y-[0.125rem]",
        "tablet:gap-y-0",
        "desktop:gap-y-0",
        className,
      )}
    >
      <Picture
        name={name}
        color={color}
        photo={photo ?? null}
        size="s"
        aria-hidden
        className={cn(
          "col-1",
          "row-[1/span_3]",
          "tablet:row-[1/span_2]",
          "desktop:row-1",
        )}
      />
      <span
        className={cn(
          "col-2 truncate text-s font-semibold text-primary",
          "row-1",
          // Alone in its column on tablet, the name centres on the row.
          email === null ? "tablet:row-[1/span_2]" : "tablet:row-1",
          "desktop:row-1",
        )}
      >
        {name}
      </span>
      {email === null ? null : (
        <span
          className={cn(
            "truncate text-xs text-secondary",
            "col-2 row-2",
            "tablet:col-2 tablet:row-2",
            "desktop:col-3 desktop:row-1",
          )}
        >
          {email}
        </span>
      )}
      <span
        className={cn(
          "",
          "col-2 row-3 mt-xs flex flex-wrap items-center gap-x-s gap-y-xs",
          "tablet:contents",
          "desktop:contents",
        )}
      >
        <Badge
          state={BADGES[status]}
          className={cn(
            "justify-self-start",
            "col-auto row-auto",
            "tablet:col-3 tablet:row-[1/span_2]",
            "desktop:col-4 desktop:row-1",
          )}
        />
        <span
          className={cn(
            "text-xs whitespace-nowrap text-secondary",
            "col-auto row-auto",
            "tablet:col-4 tablet:row-[1/span_2]",
            "desktop:col-5 desktop:row-1",
          )}
        >
          {until ?? (
            <>
              <span aria-hidden>–</span>
              <span className="sr-only">{t("personRow.noEnd")}</span>
            </>
          )}
        </span>
      </span>
      {actions === undefined ? null : (
        <Menu.Root>
          <Menu.Trigger
            className={cn(
              "",
              "col-3 row-[1/span_3]",
              "tablet:col-5 tablet:row-[1/span_2]",
              "desktop:col-6 desktop:row-1",
            )}
            render={
              <IconButton
                icon={moreIcon}
                label={t("menu.moreFor", { subject: name })}
                size="s"
                className={cn(
                  "",
                  "",
                  "",
                  "",
                  "popup-open:bg-highlight popup-open:text-primary",
                )}
              />
            }
          />
          <Menu.Popup>{actions}</Menu.Popup>
        </Menu.Root>
      )}
    </li>
  );
}
