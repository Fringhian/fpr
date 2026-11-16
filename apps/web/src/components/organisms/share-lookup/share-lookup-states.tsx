import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { WifiSlashIcon } from "@phosphor-icons/react/WifiSlash";
import type { ComponentProps, ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { quote } from "../../../lib/format/text";
import { useLanguage } from "../../../lib/i18n";
import { Button } from "../../atoms/button/button";
import { Card } from "../../atoms/card/card";
import { LoadingPlaceholder } from "../../atoms/loading-placeholder/loading-placeholder";
import { StateIcon } from "../../atoms/state-icon/state-icon";
import { TextLink } from "../../atoms/text-link/text-link";

/** Under the shares found: “Not here?” and the button that looks the text up at the price provider. */
export function Offer({
  query,
  onLookUp,
  className,
  ...props
}: { query: string; onLookUp: () => void } & Omit<
  ComponentProps<"p">,
  "children"
>) {
  const { t } = useTranslation();
  const language = useLanguage();

  return (
    <p
      {...props}
      className={cn(
        "max-w-[35rem] rounded-m border-[0.09375rem] border-dashed border-divider px-m py-s text-s text-secondary",
        className,
      )}
    >
      {t("shareLookup.notHere")}{" "}
      <TextLink
        render={<button type="button" onClick={onLookUp} />}
        className="cursor-pointer text-left"
      >
        {t("shareLookup.lookUp", { q: quote(query, language) })}
      </TextLink>
    </p>
  );
}

/** While the provider answers. */
export function Looking({ query }: { query: string }) {
  const { t } = useTranslation();
  const language = useLanguage();

  return (
    <LoadingPlaceholder className="min-h-[4rem]">
      {t("shareLookup.looking", { q: quote(query, language) })}
    </LoadingPlaceholder>
  );
}

/**
 * The lookup found nothing new, or couldn't ask: what happened, what to do,
 * and Create a manual share, the main action when nothing was found. Its
 * `title` is the card's heading.
 */
export function Missing({
  failed,
  title,
  description,
  createLink,
  className,
  ...props
}: {
  /** The provider couldn't be asked, rather than found nothing. */
  failed: boolean;
  title: string;
  description: string;
  /** Create a manual share's page, as the router's link. */
  createLink: ReactElement;
} & Omit<ComponentProps<"section">, "title" | "children">) {
  const { t } = useTranslation();

  return (
    <Card
      {...props}
      render={<section />}
      className={cn(
        "grid max-w-[35rem] justify-items-start gap-s bg-highlight p-m shadow-none",
        className,
      )}
    >
      <StateIcon
        icon={failed ? WifiSlashIcon : MagnifyingGlassIcon}
        size="m"
        className="bg-surface"
      />
      <div role="status" className="grid gap-s">
        <h2 className="text-m font-semibold">{title}</h2>
        <p className="text-s text-secondary">{description}</p>
      </div>
      <Button
        intent={failed ? "secondary" : "primary"}
        size="wide"
        render={createLink}
        nativeButton={false}
        className="mt-xs"
      >
        {t("shareLookup.create")}
      </Button>
    </Card>
  );
}
