import { useTranslation } from "react-i18next";
import { Card } from "../../../components/atoms/card/card";
import { MadeUpRace } from "../../../components/organisms/made-up-race/made-up-race";
import { cn } from "../../../lib/cn";

/** The sky panel's content on desktop: the made-up race in a card, under its caption, above the question it asks. */
export function RacePanel() {
  const { t } = useTranslation();

  return (
    <>
      <p className="text-s text-on-sky">{t("madeUpRace.caption")}</p>
      <Card elevation="rest" className="w-full max-w-[32.5rem] p-l">
        <MadeUpRace />
      </Card>
      <p className="text-center text-xl font-semibold text-balance">
        {t("madeUpRace.title")}
      </p>
    </>
  );
}

/** The made-up race above the step, on tablet only: what the desktop shows on the sky moves into the column. */
export function RaceTeaser() {
  const { t } = useTranslation();

  return (
    <Card
      render={<aside />}
      className={cn(
        "gap-s bg-highlight p-m",
        "mt-0 hidden",
        "tablet:mt-[1.75rem] tablet:grid",
        "desktop:mt-0 desktop:hidden",
      )}
    >
      <p className="text-s font-medium text-on-sky">{t("madeUpRace.title")}</p>
      <MadeUpRace />
    </Card>
  );
}
