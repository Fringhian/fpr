import type { Timestamp } from "@fpr/contracts";
import {
  createFileRoute,
  type SearchSchemaInput,
} from "@tanstack/react-router";
import { ValuePage } from "../../-share-value/value-page";

/** Add a value's search: `at`, the moment of the value it edits instead, left out when it isn't a timestamp. */
type ValueSearch = { at?: Timestamp | undefined };

function validateValueSearch(
  search: ValueSearch & SearchSchemaInput,
): ValueSearch {
  const at = search.at;
  return {
    at:
      typeof at === "string" &&
      /^\d{4}-\d{2}-\d{2}T/.test(at) &&
      !Number.isNaN(Date.parse(at))
        ? at
        : undefined,
  };
}

/** Add a value to a manual share, or edit one. */
export const Route = createFileRoute("/_focused/shares/$shareId/value")({
  staticData: { access: "portfolio" },
  validateSearch: validateValueSearch,
  component: ShareValue,
});

function ShareValue() {
  const { shareId } = Route.useParams();
  const { at } = Route.useSearch();

  return <ValuePage key={at ?? "new"} shareId={shareId} at={at} />;
}
