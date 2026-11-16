import { createFileRoute } from "@tanstack/react-router";
import { AppNotFound } from "../../-states/not-found";

/** An address under Portfolio no page answers, behind Portfolio's guard. */
export const Route = createFileRoute("/_app/portfolio/$")({
  component: AppNotFound,
});
