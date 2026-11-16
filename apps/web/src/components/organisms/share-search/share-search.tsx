// The Shares search's parts, imported as a namespace: `import * as ShareSearch from "…/share-search"`.
import type { Id, ShareQuote } from "@fpr/contracts";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { XIcon } from "@phosphor-icons/react/X";
import type { ComponentProps, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { formatMoney } from "../../../lib/format/money";
import { useLanguage } from "../../../lib/i18n";
import { IconButton } from "../../atoms/icon-button/icon-button";
import { Input as TextInput } from "../../atoms/input/input";
import * as Option from "../../molecules/option/option";
import { Status } from "./share-search-status";

export { Message, Status } from "./share-search-status";

/** The search and what it found, stacked. */
export function Root({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn("grid gap-m", className)} />;
}

/**
 * The search box: a magnifier, the text, and a cross that clears it while it
 * holds any. `label` names it for screen readers and shows as its
 * placeholder: “Search by name, ISIN or ticker”.
 */
export function Input({
  value,
  onValueChange,
  label,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  className?: string | undefined;
}) {
  const { t } = useTranslation();

  return (
    <TextInput
      type="search"
      enterKeyHint="search"
      autoComplete="off"
      spellCheck={false}
      aria-label={label}
      placeholder={label}
      icon={MagnifyingGlassIcon}
      value={value}
      onValueChange={onValueChange}
      className={className}
      end={
        value === "" ? null : (
          <IconButton
            icon={XIcon}
            size="s"
            label={t("shareSearch.clear")}
            onClick={() => onValueChange("")}
          />
        )
      }
    />
  );
}

/** A share's line under its name: its symbol, or “Manual”, and its latest price. */
function useShareLine(): (share: ShareQuote) => string {
  const { t } = useTranslation();
  const language = useLanguage();

  return (share) =>
    [
      share.symbol ?? t("badge.manual"),
      share.latestPrice === null
        ? t("badge.pricePending")
        : formatMoney(share.latestPrice.priceEur, language),
    ].join(" · ");
}

/**
 * The shares found, one option each, to pick one: its name, then its symbol
 * and latest price. Every prop of `Option.Group` but its children; name it
 * with `aria-label` or `aria-labelledby`.
 */
export function Results({
  shares,
  ...props
}: { shares: readonly ShareQuote[] } & Omit<
  Option.GroupProps<Id>,
  "children"
>) {
  const line = useShareLine();

  return (
    <Option.Group<Id> {...props}>
      {shares.map((share) => (
        <Option.Item<Id>
          key={share.id}
          value={share.id}
          title={share.name}
          description={line(share)}
        />
      ))}
    </Option.Group>
  );
}

export type BasicProps = {
  /** The text typed. */
  q: string;
  onQChange: (q: string) => void;
  /** The shares matching `q`, or `undefined` while the first answer loads. */
  shares: readonly ShareQuote[] | undefined;
  /** Why the search failed, written out, or nothing. */
  error?: string | null | undefined;
  /** Searches again after `error`. */
  onRetry?: (() => void) | undefined;
  /** The share picked at first, by id, such as the one picked before going back. */
  defaultValue?: Id | undefined;
  onValueChange: (id: Id) => void;
  /** Names the search box and the results for screen readers. */
  label: string;
  /** What follows the results, such as a lookup at the price provider. */
  children?: ReactNode;
} & Omit<ComponentProps<"div">, "children">;

/**
 * The Shares search, to pick one of FPR's shares: the search box, then the
 * shares matching it, held ones first, or a line that says nothing matches;
 * a failed search says why, with Try again. The Shares page composes the
 * parts with its own cards.
 */
export function Basic({
  q,
  onQChange,
  shares,
  error,
  onRetry,
  defaultValue,
  onValueChange,
  label,
  children,
  ...props
}: BasicProps) {
  return (
    <Root {...props}>
      <Input value={q} onValueChange={onQChange} label={label} />
      {shares === undefined || shares.length === 0 || error ? (
        <Status
          q={q}
          loading={shares === undefined}
          error={error}
          onRetry={onRetry}
        />
      ) : (
        <Results
          shares={shares}
          aria-label={label}
          defaultValue={defaultValue}
          onValueChange={onValueChange}
        />
      )}
      {children}
    </Root>
  );
}
