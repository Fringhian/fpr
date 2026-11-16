import { useTranslation } from "react-i18next";
import type en from "../locales/en.json";

/**
 * A screen not built yet: its name as the page's heading. Each route's own
 * screen replaces it.
 */
export function Placeholder({ page }: { page: keyof typeof en.pages }) {
  const { t } = useTranslation();

  return (
    <main className="min-h-dvh bg-page p-m font-sans text-primary">
      <h1 className="text-xl font-semibold">{t(`pages.${page}`)}</h1>
    </main>
  );
}
