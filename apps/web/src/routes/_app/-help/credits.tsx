import { ArrowUpRightIcon } from "@phosphor-icons/react/ArrowUpRight";
import { useTranslation } from "react-i18next";
import { TextLink } from "../../../components/atoms/text-link/text-link";

/**
 * The charts' library credit its licence asks for, since the charts carry no
 * TradingView logo: its attribution notice and a link to tradingview.com.
 */
export function Credits() {
  const { t } = useTranslation();

  return (
    <>
      <p className="text-xs text-secondary">
        {t("helpPage.sections.credits.notice")}
      </p>
      <TextLink
        href="https://www.tradingview.com/"
        target="_blank"
        rel="noopener noreferrer"
        toPage
        toPageIcon={ArrowUpRightIcon}
        className="w-fit text-s"
      >
        {t("helpPage.sections.credits.link")}
      </TextLink>
    </>
  );
}
