import { createFileRoute } from "@tanstack/react-router";
import { ScreenPlaceholder } from "../../-shell/screen-placeholder";

export const Route = createFileRoute("/_app/shares/$shareId")({
  component: () => <ScreenPlaceholder page="share" back="shares" period />,
});
