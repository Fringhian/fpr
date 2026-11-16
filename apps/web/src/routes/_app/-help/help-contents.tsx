import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { HELP_SECTIONS } from "../../../lib/help-info";

/**
 * The list of sections beside them on desktop, staying in view under the
 * compact bar: each links to its section, the one the address names in
 * charcoal.
 */
export function HelpContents({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t("helpPage.contents")}
      className={cn(
        "sticky top-[calc(var(--compact-bar)+var(--safe-top)+var(--spacing-m))] flex flex-col gap-[0.125rem] self-start",
        className,
      )}
    >
      {HELP_SECTIONS.map((section) => (
        <Link
          key={section}
          to="/help"
          hash={section}
          // Every link leads to this page: only the section's own address marks it current.
          activeOptions={{ includeHash: true }}
          activeProps={{ "aria-current": "location" }}
          className={cn(
            "rounded-full bg-transparent px-[0.75rem] py-[0.4375rem] text-s font-medium text-secondary no-underline",
            "",
            "",
            "",
            "hover:bg-highlight hover:text-primary",
            "focus-visible:focus-ring",
            "current:bg-primary current:font-semibold current:text-on-primary",
          )}
        >
          {t(`helpPage.sections.${section}.title`)}
        </Link>
      ))}
    </nav>
  );
}
