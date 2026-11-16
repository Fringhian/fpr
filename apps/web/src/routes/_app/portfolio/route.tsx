import { createFileRoute, Outlet } from "@tanstack/react-router";

/** A portfolio of one's own: members and the admin. */
export const Route = createFileRoute("/_app/portfolio")({
  staticData: { access: "portfolio" },
  component: Outlet,
});
