import { createFileRoute } from "@tanstack/react-router";
import { validateRecordSearch } from "../../../lib/record-search";
import { Placeholder } from "../../-placeholder";

export const Route = createFileRoute("/_focused/portfolio/record")({
  staticData: { access: "portfolio" },
  validateSearch: validateRecordSearch,
  component: () => <Placeholder page="portfolioRecord" />,
});
