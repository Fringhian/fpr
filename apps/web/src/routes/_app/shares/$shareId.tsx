import { createFileRoute } from "@tanstack/react-router";
import { ShareScreen } from "../-share/share-screen";

export const Route = createFileRoute("/_app/shares/$shareId")({
  component: ShareScreen,
});
