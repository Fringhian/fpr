import type { Listing, ShareSummary } from "@fpr/contracts";
import { type ComponentProps, type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { Button } from "../../atoms/button/button";
import { Card } from "../../atoms/card/card";
import { IsinAsk, type IsinAskProps } from "./share-lookup-isin";

/** What the provider found: a line saying so, then one row per share or listing. */
export function Found({
  className,
  children,
  ...props
}: ComponentProps<"section">) {
  const { t } = useTranslation();

  return (
    <section {...props} className={cn("grid max-w-[35rem] gap-s", className)}>
      <p role="status" className="text-s text-secondary">
        {t("shareLookup.found")}
      </p>
      <Card
        render={<ul />}
        className="m-0 list-none divide-y divide-divider p-0"
      >
        {children}
      </Card>
    </section>
  );
}

/** One row: the name and a line under it, then what it does. */
function Row({
  name,
  line,
  action,
  children,
}: {
  name: string;
  line: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <li className="grid gap-s px-m py-s">
      <div className="flex min-h-xl items-center gap-m">
        <span className="grid min-w-0 flex-1">
          <span className="truncate text-s font-semibold">{name}</span>
          <span className="truncate text-xs text-secondary">{line}</span>
        </span>
        {action}
      </div>
      {children}
    </li>
  );
}

/** A share the lookup found, with Add, which opens it or picks it. */
export function FoundShare({
  share,
  onAdd,
}: {
  share: ShareSummary;
  onAdd: (share: ShareSummary) => void;
}) {
  const { t } = useTranslation();

  return (
    <Row
      name={share.name}
      line={[share.symbol, share.isin].filter(Boolean).join(" · ")}
      action={
        <Button size="s" onClick={() => onAdd(share)}>
          {t("shareLookup.add")}
        </Button>
      }
    />
  );
}

export type FoundListingProps = { listing: Listing } & Pick<
  IsinAskProps,
  "onAdd" | "error" | "takenLink"
> &
  Partial<Pick<IsinAskProps, "adding">>;

/**
 * A listing the provider returned without an ISIN: Add asks for its ISIN
 * first, then stores it under that ISIN.
 */
export function FoundListing({
  listing,
  adding = false,
  ...ask
}: FoundListingProps) {
  const { t } = useTranslation();
  const [asking, setAsking] = useState(false);

  return (
    <Row
      name={listing.name}
      line={[listing.exchange, listing.tradingCurrency].join(" · ")}
      action={
        asking ? null : (
          <Button size="s" onClick={() => setAsking(true)}>
            {t("shareLookup.add")}
          </Button>
        )
      }
    >
      {asking ? (
        <IsinAsk
          {...ask}
          name={listing.name}
          adding={adding}
          onCancel={() => setAsking(false)}
        />
      ) : null}
    </Row>
  );
}
