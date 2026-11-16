import { useRender } from "@base-ui/react/use-render";
import type { Decimal } from "@fpr/contracts";
import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { formatMoney, formatPercent } from "../../../lib/format/money";
import { useLanguage } from "../../../lib/i18n";
import { Card } from "../../atoms/card/card";
import { Icon, type IconProps } from "../../foundations/icon/icon";
import * as Menu from "../menu/menu";

export const caption = "text-xs text-secondary";

const big = "text-l font-semibold tabular-nums";

/** The card, an `<article>`. Name it with `aria-labelledby`, the `Name`'s id. */
export function Root({ className, ...props }: ComponentProps<"article">) {
  return (
    <Card
      {...props}
      render={<article />}
      className={cn(
        "relative flex min-w-0 flex-col gap-s p-m font-sans text-primary",
        className,
      )}
    />
  );
}

/** The top row: the `Name`, then a badge and the `Actions`. */
export function Header({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn("flex min-h-l items-center gap-s", className)}
    />
  );
}

/**
 * The name as a link to the share's page. Its hit area stretches over the
 * whole card, under the ⋯ button, and its focus ring draws round the card.
 */
function NameLink({
  link,
  icon,
  children,
}: {
  link: ReactElement;
  icon: IconProps["icon"];
  children: ReactNode;
}) {
  return useRender({
    render: link,
    defaultTagName: "a",
    props: {
      className: cn(
        "flex min-w-0 items-center gap-xs text-primary no-underline outline-none after:absolute after:inset-0 after:rounded-l after:content-['']",
        "",
        "",
        "",
        "hover:underline",
        "focus-visible:after:focus-ring",
      ),
      children: (
        <>
          <span className="truncate">{children}</span>
          <Icon icon={icon} size="s" className="text-secondary" />
        </>
      ),
    },
  });
}

export type NameProps = {
  /** Makes the card open the share's page: an `<a href>`, or the router's link, `<Link to="/shares/$shareId" … />`. The name then ends with `linkIcon`. */
  link?: ReactElement | undefined;
  /** The icon that ends a linked name, any Phosphor icon. A caret by default. */
  linkIcon?: IconProps["icon"] | undefined;
} & ComponentProps<"p">;

/** The card's name, truncated on one line, linked or not. */
export function Name({
  link,
  linkIcon = CaretRightIcon,
  className,
  children,
  ...props
}: NameProps) {
  return (
    <p
      {...props}
      className={cn("min-w-0 flex-1 text-s font-semibold", className)}
    >
      {link === undefined ? (
        <span className="block truncate">{children}</span>
      ) : (
        <NameLink link={link} icon={linkIcon}>
          {children}
        </NameLink>
      )}
    </p>
  );
}

/** The ⋯ button in the card's corner and its menu, whose items are the children. Every other prop goes to the button. */
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
        className={cn("relative", className)}
      />
      <Menu.Popup>{children}</Menu.Popup>
    </Menu.Root>
  );
}

/** A small grey line under the name. */
export function Caption({ className, ...props }: ComponentProps<"p">) {
  return <p {...props} className={cn(caption, className)} />;
}

/** The value line, at the card's foot whatever the height of the cards beside it. */
export function Foot({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "mt-auto flex flex-wrap items-center justify-between gap-s",
        className,
      )}
    />
  );
}

/**
 * The card's big figure: an amount in whole euros, or, for an anonymous
 * viewer, the weight in percent of the portfolio. Nothing when it is missing.
 */
export function Figure({
  anonymous,
  amountEur,
  weight,
}: {
  anonymous: boolean;
  amountEur: Decimal | null | undefined;
  weight: Decimal | null;
}) {
  const { t } = useTranslation();
  const language = useLanguage();

  if (anonymous) {
    return weight === null ? null : (
      <span className="flex flex-wrap items-baseline gap-x-xs">
        <span className={big}>{formatPercent(weight, language)}</span>
        <span className={caption}>{t("holdingCard.ofPortfolio")}</span>
      </span>
    );
  }
  return amountEur === null || amountEur === undefined ? null : (
    <span className={big}>
      {formatMoney(amountEur, language, { precision: "euros" })}
    </span>
  );
}
