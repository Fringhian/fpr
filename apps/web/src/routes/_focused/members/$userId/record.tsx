import { createFileRoute } from "@tanstack/react-router";
import { validateRecordSearch } from "../../../../lib/record-search";
import { Placeholder } from "../../../-placeholder";

/** The admin records a change for a member. */
export const Route = createFileRoute("/_focused/members/$userId/record")({
  staticData: { access: "admin" },
  validateSearch: validateRecordSearch,
  component: () => <Placeholder page="memberRecord" />,
});
