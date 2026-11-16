import { createFileRoute, redirect } from "@tanstack/react-router";
import { holdAccessKey } from "./-access-link/held-key";

/**
 * An access link as the admin sent it. Its key works as a password, so it
 * never stays in the address: the key is held in memory and the address is
 * replaced by `/access`, which opens it, in place of this entry of the
 * history.
 */
export const Route = createFileRoute("/_focused/access/$key")({
  staticData: { access: "signedOut" },
  beforeLoad: ({ params }) => {
    holdAccessKey(params.key);
    throw redirect({ to: "/access", replace: true });
  },
});
