import { createFileRoute, Outlet } from "@tanstack/react-router";

/** The everyday pages, with the navigation: every role, once onboarded. */
export const Route = createFileRoute("/_app")({
  staticData: { access: "everyone" },
  component: Outlet,
});
