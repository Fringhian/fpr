import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../-placeholder";

export const Route = createFileRoute("/_app/portfolio/")({
  component: () => <Placeholder page="portfolio" />,
});
