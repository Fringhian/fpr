import { createFileRoute } from "@tanstack/react-router";
import { AppNotFound } from "../../-states/not-found";

/** An address under the admin area no page answers, behind the area's guard. */
export const Route = createFileRoute("/_app/admin/$")({
  component: AppNotFound,
});
