import { createFileRoute, Outlet } from "@tanstack/react-router";
import * as Toast from "../components/molecules/toast/toast";

/**
 * The focused pages, with no navigation: getting in, onboarding, and
 * recording a change. Each names who may enter it.
 */
export const Route = createFileRoute("/_focused")({
  component: FocusedLayout,
});

function FocusedLayout() {
  return (
    <>
      <Outlet />
      <Toast.Region />
    </>
  );
}
