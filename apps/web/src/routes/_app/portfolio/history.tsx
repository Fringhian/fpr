import { createFileRoute } from "@tanstack/react-router";
import { ScreenPlaceholder } from "../../-shell/screen-placeholder";

export const Route = createFileRoute("/_app/portfolio/history")({
  component: () => (
    <ScreenPlaceholder page="portfolioHistory" back="portfolio" />
  ),
});
