import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../-placeholder";

export const Route = createFileRoute("/_app/shares/$shareId")({
  component: () => <Placeholder page="share" />,
});
