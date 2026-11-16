import { createFileRoute } from "@tanstack/react-router";
import { appPath } from "../../lib/session/access";
import { Placeholder } from "../-placeholder";
import { AccessEnded } from "./-sign-in/access-ended";

/**
 * Sign-in's search: `redirect`, the page to open once signed in, and
 * `access=ended` after the API ended the person's access. Each is set, if
 * only to `undefined`, so no raw value of the address passes through.
 */
export const Route = createFileRoute("/_focused/sign-in")({
  staticData: { access: "signedOut" },
  validateSearch: (
    search,
  ): { redirect?: string | undefined; access?: "ended" | undefined } => ({
    redirect: appPath(search.redirect),
    access: search.access === "ended" ? "ended" : undefined,
  }),
  component: SignIn,
});

function SignIn() {
  const { access } = Route.useSearch();

  return access === "ended" ? <AccessEnded /> : <Placeholder page="signIn" />;
}
