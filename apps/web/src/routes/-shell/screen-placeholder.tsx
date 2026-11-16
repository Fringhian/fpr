import { useTranslation } from "react-i18next";
import type en from "../../locales/en.json";
import { Screen, type ScreenProps } from "./screen";

/**
 * An everyday screen not built yet, in the app shell: its page bar, with the
 * page's name as its heading. Each route's own screen replaces it.
 */
export function ScreenPlaceholder({
  page,
  back,
  period,
}: { page: keyof typeof en.pages } & Pick<ScreenProps, "back" | "period">) {
  const { t } = useTranslation();

  const name = t(`pages.${page}`);

  return (
    <Screen title={name} back={back} period={period}>
      {back ? <h1 className="text-xl font-semibold">{name}</h1> : null}
    </Screen>
  );
}
