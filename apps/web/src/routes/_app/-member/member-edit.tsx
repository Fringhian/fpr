import type { Id, Portfolio, Timestamp } from "@fpr/contracts";
import { PencilSimpleIcon } from "@phosphor-icons/react/PencilSimple";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { Link } from "@tanstack/react-router";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "../../../components/atoms/button/button";
import { Card } from "../../../components/atoms/card/card";
import { StateIcon } from "../../../components/atoms/state-icon/state-icon";
import { cn } from "../../../lib/cn";
import { editPortfolioLink } from "../../../lib/edit-portfolio";
import { useSession } from "../../../lib/session/use-session";
import { LatestChanges } from "../-portfolio-sections/latest-changes";
import type { LogRow } from "../-portfolio-sections/log-rows";
import { OwnedHoldings } from "../-portfolio-sections/owned-holdings";
import { useRecord } from "../-portfolio-sections/record-link";

/**
 * The admin's action on a member's page, for its `HeaderAction` and
 * `PhoneAction`: Edit portfolio, or in edit mode Record a change for them.
 * `null` for everyone else.
 */
export function useAdminAction(userId: Id, name: string, editing: boolean) {
  const { t } = useTranslation();
  const { admin } = useSession();
  const record = useRecord(userId);

  if (!admin) return null;
  return editing
    ? {
        intent: "primary" as const,
        icon: PlusIcon,
        render: record.link(),
        children: t("editPortfolio.record", { name }),
      }
    : {
        icon: PencilSimpleIcon,
        render: editPortfolioLink(userId),
        children: t("editPortfolio.start"),
      };
}

/** Edit mode's banner, first on the ridge: whose portfolio is being edited, and Done editing back to the page read-only. */
export function EditBanner({ userId, name }: { userId: Id; name: string }) {
  const { t } = useTranslation();

  return (
    <Card
      elevation="rest"
      className={cn(
        "flex flex-wrap items-center gap-m",
        "p-m",
        "tablet:px-l",
        "desktop:px-l",
      )}
    >
      <StateIcon icon={PencilSimpleIcon} size="m" />
      <p className="min-w-0 grow basis-[12rem] text-s text-secondary">
        <Trans
          i18nKey="editPortfolio.banner"
          values={{ name }}
          components={{
            strong: <strong className="font-semibold text-primary" />,
          }}
        />
      </p>
      <Button
        nativeButton={false}
        render={
          <Link
            to="/members/$userId"
            params={{ userId }}
            search={{ edit: undefined }}
          />
        }
        className="ml-auto"
      >
        {t("editPortfolio.done")}
      </Button>
    </Card>
  );
}

/**
 * Portfolio's controls on a member's page in edit mode: their holdings with
 * ⋯ to buy more or sell and the cash card, then the latest changes, each
 * with ⋯ to edit or delete it, and the link to every change.
 */
export function EditableSections({
  userId,
  name,
  portfolio,
  rows,
  cashSetAt,
}: {
  userId: Id;
  name: string;
  portfolio: Portfolio | undefined;
  rows: readonly LogRow[] | undefined;
  cashSetAt: Timestamp | undefined;
}) {
  const { t } = useTranslation();

  return (
    <>
      <OwnedHoldings
        userId={userId}
        portfolio={portfolio}
        cashSetAt={cashSetAt}
        label={t("memberPage.holdings", { name })}
      />
      <LatestChanges
        userId={userId}
        rows={rows}
        historyLink={<Link to="/members/$userId/history" params={{ userId }} />}
      />
    </>
  );
}
