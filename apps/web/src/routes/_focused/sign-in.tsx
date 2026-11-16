import { createFileRoute } from "@tanstack/react-router";
import { appPath } from "../../lib/session/access";
import { AccessEnded } from "./-access/access-ended";
import { PasteLink } from "./-sign-in/paste-link";
import { SignInForm } from "./-sign-in/sign-in-form";

/**
 * Sign-in's search: `redirect`, the page to open once signed in,
 * `access=ended` after the API ended the person's access, and `step=link`
 * for the step that takes a pasted access link. Each is set, if only to
 * `undefined`, so no raw value of the address passes through.
 */
export const Route = createFileRoute("/_focused/sign-in")({
  staticData: { access: "signedOut" },
  validateSearch: (
    search,
  ): {
    redirect?: string | undefined;
    access?: "ended" | undefined;
    step?: "link" | undefined;
  } => ({
    redirect: appPath(search.redirect),
    access: search.access === "ended" ? "ended" : undefined,
    step: search.step === "link" ? "link" : undefined,
  }),
  component: SignIn,
});

function SignIn() {
  const { access, step } = Route.useSearch();

  if (access === "ended") {
    return <AccessEnded />;
  }
  return step === "link" ? <PasteLink /> : <SignInForm />;
}
