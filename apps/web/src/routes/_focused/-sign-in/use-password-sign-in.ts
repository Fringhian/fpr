import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { signInWithPassword } from "../../../lib/session/better-auth";

/**
 * The password sign-in. Once signed in, every cached answer is stale, as
 * after any write that starts a session, and the person lands on `redirect`
 * or Home; the guards send them on to onboarding if it isn't finished. A
 * person whose access ended lands on “Your access has ended”. The other
 * outcomes are the form's to show.
 */
export function usePasswordSignIn(redirect: string | undefined) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: signInWithPassword,
    onSuccess: async (outcome) => {
      if (outcome === "signedIn") {
        await queryClient.invalidateQueries();
        await navigate({ href: redirect ?? "/", replace: true });
      }
      if (outcome === "accessEnded") {
        await navigate({
          to: "/sign-in",
          search: { access: "ended" },
          replace: true,
        });
      }
    },
  });
}
