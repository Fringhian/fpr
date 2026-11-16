import { createFileRoute, redirect } from "@tanstack/react-router";

/** The admin area opens on People. */
export const Route = createFileRoute("/_app/admin/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/people" });
  },
});
