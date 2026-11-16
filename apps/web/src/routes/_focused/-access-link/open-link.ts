import type { AccessKeyState } from "@fpr/contracts";
import { accessKeyStates } from "@fpr/contracts/values";
import { MutationObserver, type QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { accessKeyIn } from "../../../lib/access-checks";
import type { Api } from "../../../lib/api/api";
import { isApiError } from "../../../lib/api/errors";
import { oneOf } from "../../../lib/one-of";
import { forgetAccessKey, heldAccessKey } from "./held-key";

/**
 * Where an access link stops, as its page says it: a key in one of the
 * API's states, `claimed` being a password user's link already used, or
 * `missing` when no key is held, as after a reload.
 */
export type LinkState = Exclude<AccessKeyState, "waiting"> | "missing";

const refusedStates = accessKeyStates.filter(
  (state): state is Exclude<AccessKeyState, "waiting"> => state !== "waiting",
);

/** What the access link page shows: a password user's first use, or where the link stops. */
export type OpenedLink =
  | { state: "invited"; key: string; email: string; displayName: string }
  | { state: LinkState };

/**
 * The state an `invalid_access_key` refusal names, or nothing for any other
 * failure. A key refused while it reads as waiting is shown as unknown.
 */
export function refusedState(error: unknown): LinkState | undefined {
  if (!isApiError(error, "invalid_access_key")) {
    return undefined;
  }
  const { data } = error;
  const state =
    typeof data === "object" && data !== null && "state" in data
      ? data.state
      : undefined;
  return oneOf(refusedStates, state) ?? "unknown";
}

/**
 * Runs a write on the key, then forgets the key and leads to `to`. A refusal
 * shows the key's state; any other failure is the page's.
 */
async function writeThenGo(
  write: Promise<unknown>,
  to: "/" | "/sign-in",
): Promise<OpenedLink> {
  try {
    await write;
  } catch (error) {
    const state = refusedState(error);
    if (state === undefined) {
      throw error;
    }
    return { state };
  }
  forgetAccessKey();
  throw redirect({ to, replace: true });
}

/**
 * Opens the held access link: the key goes to the API in a request body.
 * An anonymous viewer's link signs them in and leads Home, every time until
 * their access ends. A password user's new link, when they already have a
 * password, is claimed at once and leads to sign-in. A waiting link of a
 * password user is only checked, so leaving before the password keeps it
 * valid. Every other link stops on its state.
 */
export async function openAccessLink({
  api,
  queryClient,
}: {
  api: Api;
  queryClient: QueryClient;
}): Promise<OpenedLink> {
  const key = heldAccessKey();
  if (key === undefined) {
    return { state: "missing" };
  }
  if (accessKeyIn(key) !== key) {
    return { state: "unknown" };
  }
  const link = await api.access.check.call({ key });
  if (link.state === "unknown") {
    return link;
  }
  if (link.signsInWith === "link") {
    return link.state === "waiting" || link.state === "claimed"
      ? writeThenGo(
          new MutationObserver(
            queryClient,
            api.access.signIn.mutationOptions(),
          ).mutate({ key }),
          "/",
        )
      : { state: link.state };
  }
  if (link.state !== "waiting") {
    return { state: link.state };
  }
  if (link.hasPassword) {
    return writeThenGo(
      new MutationObserver(
        queryClient,
        api.access.claim.mutationOptions(),
      ).mutate({ key }),
      "/sign-in",
    );
  }
  return {
    state: "invited",
    key,
    email: link.email,
    displayName: link.displayName,
  };
}
