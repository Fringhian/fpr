import { createFileRoute } from "@tanstack/react-router";
import { validateHomeSearch } from "../../lib/view-state/view-search";
import { HomeScreen } from "./-home/home-screen";

/** Home's search: the member kept in focus and the standings' board. */
export const Route = createFileRoute("/_app/")({
  validateSearch: validateHomeSearch,
  component: HomeScreen,
});
