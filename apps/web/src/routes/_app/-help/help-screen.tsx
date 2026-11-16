import { useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { HELP_SECTIONS } from "../../../lib/help-info";
import { oneOf } from "../../../lib/one-of";
import { Screen } from "../../-shell/screen";
import { HelpContents } from "./help-contents";
import { HelpSection } from "./help-section";

/**
 * How FPR works: one page of short sections, each at its own address
 * (`/help#cash`), the one the address names tinted. On desktop the list of
 * sections sits beside them. Nothing opens by itself.
 */
export function HelpScreen() {
  const { t } = useTranslation();
  const hash = useLocation({ select: (location) => location.hash });

  const current = oneOf(HELP_SECTIONS, hash);

  return (
    <Screen title={t("pages.help")}>
      <div
        className={cn(
          "grid pb-l",
          "grid-cols-1 gap-0",
          "tablet:grid-cols-1 tablet:gap-0",
          "desktop:grid-cols-[13.75rem_minmax(0,1fr)] desktop:gap-[1.75rem]",
        )}
      >
        <HelpContents
          className={cn("", "hidden", "tablet:hidden", "desktop:flex")}
        />
        {/* The sections' padding sits in the gutter, so their text lines up with the title. */}
        <div
          className={cn(
            "flex max-w-[48rem] flex-col gap-xs",
            "-mx-s",
            "tablet:-mx-m",
            "desktop:-mx-m",
          )}
        >
          {HELP_SECTIONS.map((section) => (
            <HelpSection
              key={section}
              id={section}
              current={section === current}
            />
          ))}
        </div>
      </div>
    </Screen>
  );
}
