import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useApi } from "../../../lib/api/use-api";
import { readStoredSetting } from "../../../lib/view-state/stored-setting";
import { DEFAULT_SETTING } from "../../../lib/view-state/view-search";
import { Balance } from "../../_app/-portfolio/portfolio-chart";
import * as ChartCard from "../../_app/-portfolio-sections/chart-card";
import { useFlow } from "./flow";

/**
 * The saved step's sky panel: the owner's balance over their kept period,
 * with the changes just saved marked on it.
 */
export function PortfolioNow() {
  const { t } = useTranslation();
  const api = useApi();
  const { owner } = useFlow();
  const history = useQuery(
    api.portfolio.balanceHistory.queryOptions({
      input: {
        userId: owner.id,
        period: readStoredSetting().period ?? DEFAULT_SETTING.period,
      },
    }),
  );

  return (
    <>
      <p className="text-s text-on-sky">
        {t(`recordChange.saved.now.${owner.own ? "you" : "member"}`, {
          name: owner.name,
        })}
      </p>
      <ChartCard.Root className="w-full max-w-[30rem]">
        {history.data ? (
          <Balance history={history.data} color={owner.color} />
        ) : (
          <ChartCard.Loading />
        )}
      </ChartCard.Root>
    </>
  );
}
