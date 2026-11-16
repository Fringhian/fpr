import { createFileRoute } from "@tanstack/react-router";
import { HistoryScreen } from "../-history/history-screen";

export const Route = createFileRoute("/_app/portfolio/history")({
  component: HistoryScreen,
});
