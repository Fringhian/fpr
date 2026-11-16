import { createFileRoute, retainSearchParams } from "@tanstack/react-router";
import { validatePeriodSearch } from "../lib/view-state/view-search";
import { AppShell } from "./-shell/app-shell";

/**
 * The everyday pages, in the app shell: every role, once onboarded. Each
 * address names the shared period and unit, and every link between the pages
 * keeps them, so a shared link opens on the same view.
 */
export const Route = createFileRoute("/_app")({
  staticData: { access: "everyone" },
  validateSearch: validatePeriodSearch,
  search: { middlewares: [retainSearchParams(["period", "unit"])] },
  component: AppShell,
});
