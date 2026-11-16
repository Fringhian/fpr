import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../-placeholder";

export const Route = createFileRoute("/_focused/portfolio/record")({
  staticData: { access: "portfolio" },
  component: () => <Placeholder page="portfolioRecord" />,
});
