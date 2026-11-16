import type { Position, ShareDetail } from "@fpr/contracts";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/atoms/button/button";
import { Card } from "../../../components/atoms/card/card";
import { GainValue } from "../../../components/atoms/gain-value/gain-value";
import { cn } from "../../../lib/cn";
import { formatMoney } from "../../../lib/format/money";
import { formatQuantity } from "../../../lib/format/number";
import { useLanguage } from "../../../lib/i18n";
import { useSession } from "../../../lib/session/use-session";
import { useViewState } from "../../../lib/view-state/use-view-state";
import { useRecord } from "../-portfolio-sections/record-link";

/** “60 units · €5,904”, and the gain since bought: “+7.7% since you bought”. */
function Held({ position }: { position: Position }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { setting } = useViewState();

  const units =
    position.quantity === null
      ? null
      : t("holdingCard.units", {
          count: Number(position.quantity),
          quantity: formatQuantity(position.quantity, language),
        });
  const value =
    position.valueEur === null
      ? null
      : formatMoney(position.valueEur, language, { precision: "euros" });

  return (
    <div className="grid min-w-0 grow gap-xs">
      <span className="text-xs text-secondary">
        {t("sharePage.position.title")}
      </span>
      <p className="text-s">
        <span className="font-semibold tabular-nums">
          {[units, value].filter(Boolean).join(" · ")}
        </span>
        {position.gain === null ? null : (
          <span className="text-xs">
            {" "}
            <GainValue gain={position.gain} unit={setting.unit} />{" "}
            <span className="text-secondary">
              {t("sharePage.position.sinceBought")}
            </span>
          </span>
        )}
      </p>
    </div>
  );
}

const ACTION = cn("", "grow", "tablet:grow-0", "desktop:grow-0");

/**
 * The viewer's position on the share, the first card on the ridge: how many
 * they hold, its value and its gain since they bought, or that they don't
 * hold it; then Sell when they do, and Buy, each opening Record a change on
 * the share. A manual share adds Add a value, its main action. Only a viewer
 * with a portfolio has it.
 */
export function SharePosition({ share }: { share: ShareDetail }) {
  const { t } = useTranslation();
  const { person } = useSession();
  const record = useRecord(person.id);

  const manual = share.kind === "manual";
  const { position } = share;
  const recordOn = (kind: "buy" | "sell") =>
    record.link({ kind, share: share.id });

  return (
    <Card
      elevation="rest"
      className={cn(
        "flex gap-m p-m",
        "flex-col",
        "tablet:flex-row tablet:items-center tablet:px-l",
        "desktop:flex-row desktop:items-center desktop:px-l",
      )}
    >
      {position ? (
        <Held position={position} />
      ) : (
        <p className="grow text-s text-secondary">
          {t("sharePage.position.none")}
        </p>
      )}
      <div className="flex flex-wrap gap-s">
        {position ? (
          <Button
            nativeButton={false}
            render={recordOn("sell")}
            className={ACTION}
          >
            {t("sharePage.position.sell")}
          </Button>
        ) : null}
        <Button
          intent={manual ? "secondary" : "primary"}
          nativeButton={false}
          render={recordOn("buy")}
          className={ACTION}
        >
          {t("sharePage.position.buy")}
        </Button>
        {manual ? (
          <Button
            intent="primary"
            nativeButton={false}
            render={
              <Link
                to="/shares/$shareId/value"
                params={{ shareId: share.id }}
              />
            }
            className={ACTION}
          >
            {t("sharePage.addValue")}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
