import type { Decimal, IsoDate, Timestamp } from "@fpr/contracts";
import { type ComponentProps, type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";
import { formatDate } from "../../../lib/format/date";
import { useLanguage } from "../../../lib/i18n";
import { TextLink } from "../../atoms/text-link/text-link";
import type { IconProps } from "../../foundations/icon/icon";
import {
  Caption,
  Figure,
  Foot,
  Header,
  Name,
  Root,
} from "./holding-card-parts";

export type CashProps = {
  /** The cash held, in euros. An anonymous viewer has none. */
  amountEur?: Decimal | null | undefined;
  /** The cash's weight in percent of the balance, shown to an anonymous viewer in place of the amount. */
  weight: Decimal | null;
  /** The day the cash was last set, or the moment of that entry. */
  setOn?: IsoDate | Timestamp | undefined;
  /** The viewer is anonymous: the weight in percent replaces the amount. */
  anonymous?: boolean;
  /** Opens the cash step of Record a change. Without it, the card has no Update cash action. */
  onUpdateCash?: (() => void) | undefined;
  /** The icon that ends Update cash, any Phosphor icon. A caret by default. */
  updateCashIcon?: IconProps["icon"] | undefined;
  /** The time zone a moment's day is read in. The browser's by default. */
  timeZone?: string | undefined;
  /** Beside the name, such as an ⓘ that explains cash. */
  info?: ReactNode;
} & Omit<
  ComponentProps<"article">,
  | "amountEur"
  | "weight"
  | "setOn"
  | "anonymous"
  | "onUpdateCash"
  | "updateCashIcon"
  | "timeZone"
  | "info"
  | "children"
>;

/** The cash someone holds, the last card after their holdings: its amount, the day it was set, and Update cash. */
export function Cash({
  amountEur,
  weight,
  setOn,
  anonymous = false,
  onUpdateCash,
  updateCashIcon,
  timeZone,
  info,
  ...props
}: CashProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const titleId = useId();

  return (
    <Root {...props} aria-labelledby={titleId}>
      <Header>
        <Name id={titleId} className={info ? "flex-initial" : undefined}>
          {t("holdingCard.cash")}
        </Name>
        {info}
      </Header>
      {setOn === undefined ? null : (
        <Caption>
          {t("holdingCard.setOn", {
            date: formatDate(setOn, language, { timeZone }),
          })}
        </Caption>
      )}
      <Foot>
        <Figure anonymous={anonymous} amountEur={amountEur} weight={weight} />
        {onUpdateCash === undefined ? null : (
          <TextLink
            toPage
            toPageIcon={updateCashIcon}
            render={<button type="button" />}
            onClick={onUpdateCash}
            className="cursor-pointer bg-transparent text-s"
          >
            {t("holdingCard.updateCash")}
          </TextLink>
        )}
      </Foot>
    </Root>
  );
}
