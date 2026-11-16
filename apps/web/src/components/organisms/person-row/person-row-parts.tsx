import type { IsoDate, Timestamp } from "@fpr/contracts";
import type { ComponentProps, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn, stateClassName } from "../../../lib/cn";
import { formatDate } from "../../../lib/format/date";
import { useLanguage } from "../../../lib/i18n";
import { Badge, type BadgeState } from "../../atoms/badge/badge";
import {
  Picture as BasePicture,
  type PictureProps,
} from "../../atoms/picture/picture";
import * as Menu from "../../molecules/menu/menu";

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

const BADGES = {
  waiting: "waitingForFirstUse",
  active: "active",
  expired: "expired",
  ended: "ended",
  revoked: "revoked",
} as const satisfies Record<AccessStatus, BadgeState>;

/**
 * The list the rows go in. Its columns are shared by every row, so the
 * emails, badges and end dates line up from one row to the next.
 */
export function List({ className, ...props }: ComponentProps<"ul">) {
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

/** One person, an `<li>` on the list's columns. */
export function Root({ className, ...props }: ComponentProps<"li">) {
  return (
    <li
      {...props}
      className={cn(
        "col-span-full grid grid-cols-subgrid items-center rounded-card bg-surface px-[0.875rem] py-[0.625rem] shadow-outline",
        "gap-y-[0.125rem]",
        "tablet:gap-y-0",
        "desktop:gap-y-0",
        className,
      )}
    />
  );
}

/** The person's picture in the first column, hidden from screen readers: the name is written beside it. */
export function Picture({ className, ...props }: Omit<PictureProps, "size">) {
  return (
    <BasePicture
      aria-hidden
      {...props}
      size="s"
      className={stateClassName(
        cn("col-1", "row-[1/span_3]", "tablet:row-[1/span_2]", "desktop:row-1"),
        className,
      )}
    />
  );
}

/** The name, and the email under it on phone and tablet or in its own column on desktop. */
export function Name({ name, email }: { name: string; email: string | null }) {
  return (
    <>
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
    </>
  );
}

/** The end date with its year, or a dash read “No end date”. */
function EndDate({ accessUntil }: { accessUntil: IsoDate | Timestamp | null }) {
  const { t } = useTranslation();
  const language = useLanguage();

  return accessUntil === null ? (
    <>
      <span aria-hidden>–</span>
      <span className="sr-only">{t("personRow.noEnd")}</span>
    </>
  ) : (
    t("personRow.until", {
      date: formatDate(accessUntil, language, { year: true }),
    })
  );
}

/**
 * The access status's badge and the end date, under the name on phone and in
 * their own columns from tablet up.
 */
export function Access({
  status,
  accessUntil,
}: {
  status: AccessStatus;
  accessUntil: IsoDate | Timestamp | null;
}) {
  return (
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
        <EndDate accessUntil={accessUntil} />
      </span>
    </span>
  );
}

/** The ⋯ button in the last column and its menu, whose items are the children. Every other prop goes to the button. */
export function Actions({
  children,
  className,
  ...props
}: { children: ReactNode } & Omit<Menu.MoreTriggerProps, "size">) {
  return (
    <Menu.Root>
      <Menu.MoreTrigger
        {...props}
        size="s"
        className={stateClassName(
          cn(
            "",
            "col-3 row-[1/span_3]",
            "tablet:col-5 tablet:row-[1/span_2]",
            "desktop:col-6 desktop:row-1",
          ),
          className,
        )}
      />
      <Menu.Popup>{children}</Menu.Popup>
    </Menu.Root>
  );
}
