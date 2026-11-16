import { createFileRoute } from "@tanstack/react-router";
import { PortfolioScreen } from "../-portfolio/portfolio-screen";

export const Route = createFileRoute("/_app/portfolio/")({
  component: PortfolioScreen,
});
