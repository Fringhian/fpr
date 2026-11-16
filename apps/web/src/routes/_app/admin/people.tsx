import { createFileRoute } from "@tanstack/react-router";
import { PeopleScreen } from "./-people/people-screen";

export const Route = createFileRoute("/_app/admin/people")({
  component: PeopleScreen,
});
