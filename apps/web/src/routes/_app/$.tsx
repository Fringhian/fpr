import { createFileRoute } from "@tanstack/react-router";
import { AppNotFound } from "../-states/not-found";

/**
 * Every address no other route answers: Page not found, inside the app shell
 * for a signed-in person. Signed out, the guard leads to sign-in first.
 */
export const Route = createFileRoute("/_app/$")({
  component: AppNotFound,
});
