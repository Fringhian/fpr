import { useRender } from "@base-ui/react/use-render";
import type { IsoDate } from "@fpr/contracts";
import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { formatDate } from "../../../lib/format/date";
import { useLanguage } from "../../../lib/i18n";
import type { Look } from "../../../lib/look";
import { Badge } from "../../atoms/badge/badge";
import { Card } from "../../atoms/card/card";
import { Picture } from "../../atoms/picture/picture";
import { Icon, type IconProps } from "../../foundations/icon/icon";
import { YouSuffix } from "../../molecules/lane/lane-name";

export { Curve, Figures, NoShares } from "./member-strip-figures";
export { Holdings } from "./member-strip-holdings";

/** The list the strips go in, one under the other. */
export function List({ className, ...props }: ComponentProps<"ul">) {
  return (
    <ul
      {...props}
      className={cn("m-0 grid list-none gap-s p-0 font-sans", className)}
    />
  );
}

/**
 * One member, an `<li>` card in columns from tablet up: who, the caret, the
 * curve, the figures, then on desktop the top holdings. On phone the curve
 * and the holdings go under the name. The viewer's own strip is tinted.
 */
export function Root({
  you = false,
  className,
  ...props
}: {
  /** The viewer's own strip: tinted, with no outline. */
  you?: boolean | undefined;
} & ComponentProps<"li">) {
  return (
    <Card
      render={<li {...props} />}
      className={cn(
        "relative grid items-center gap-x-m p-m text-primary",
        "grid-cols-[minmax(0,1fr)_auto_auto] gap-y-s [grid-template-areas:'who_figures_caret'_'curve_curve_curve'_'holdings_holdings_holdings']",
        "tablet:grid-cols-[minmax(0,12rem)_auto_minmax(0,1fr)_minmax(0,7rem)] tablet:gap-y-0 tablet:[grid-template-areas:'who_caret_curve_figures']",
        "desktop:grid-cols-[minmax(0,13rem)_auto_minmax(0,1fr)_minmax(0,7rem)_minmax(0,1.25fr)] desktop:gap-y-0 desktop:[grid-template-areas:'who_caret_curve_figures_holdings']",
        you ? "bg-highlight shadow-none" : "",
        className,
      )}
    />
  );
}

/** The member's name as the link that opens their page: its hit area covers the strip. */
function NameLink({
  link,
  children,
}: {
  link: ReactElement;
  children: ReactNode;
}) {
  return useRender({
    render: link,
    defaultTagName: "a",
    props: {
      className: cn(
        "card-link block truncate text-m font-semibold text-primary no-underline",
        "",
        "",
        "",
        "hover:underline",
        "focus-visible:after:focus-ring",
      ),
      children,
    },
  });
}

/** “since 12 Feb”, with the year when it isn't this one. */
function Since({ since }: { since: IsoDate }) {
  const { t } = useTranslation();
  const language = useLanguage();

  const year = since.slice(0, 4) !== String(new Date().getFullYear());

  return (
    <span className="text-xs text-secondary">
      {t("lane.since", { date: formatDate(since, language, { year }) })}
    </span>
  );
}

export type WhoProps = Look & {
  /** Opens the member's page, or the viewer's Portfolio: the router's link, `<Link to="/members/$userId" … />`. */
  link: ReactElement;
  /** The viewer's own strip: “· you” after the name. */
  you?: boolean | undefined;
  /** The day of their first entry, or `null` before it. */
  since: IsoDate | null;
  /** A held share has no price yet: “Incomplete”. */
  incomplete?: boolean | undefined;
} & Omit<
    ComponentProps<"div">,
    keyof Look | "link" | "you" | "since" | "incomplete" | "children"
  >;

/** The picture, the name that opens the member's page, “since” the first entry and “Incomplete”. */
export function Who({
  name,
  color,
  photo,
  link,
  you = false,
  since,
  incomplete = false,
  className,
  ...props
}: WhoProps) {
  return (
    <div
      {...props}
      className={cn(
        "flex min-w-0 items-center gap-s [grid-area:who]",
        className,
      )}
    >
      <Picture aria-hidden name={name} color={color} photo={photo} size="m" />
      <span className="flex min-w-0 flex-col">
        <NameLink link={link}>
          {name}
          {you ? <YouSuffix /> : null}
        </NameLink>
        <span className="flex flex-wrap items-center gap-x-s gap-y-xs">
          {since === null ? null : <Since since={since} />}
          {incomplete ? <Badge state="incomplete" /> : null}
        </span>
      </span>
    </div>
  );
}

/** The caret that says the strip opens a page. */
export function Caret({
  icon = CaretRightIcon,
  className,
  ...props
}: { icon?: IconProps["icon"] | undefined } & Omit<
  IconProps,
  "icon" | "size"
>) {
  return (
    <Icon
      {...props}
      icon={icon}
      size="s"
      className={cn("text-secondary [grid-area:caret]", className)}
    />
  );
}
