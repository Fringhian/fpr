import { anonymizeResponse, apiContract, type RouteMeta } from "@fpr/contracts";
import { implement, os } from "@orpc/server";
import type { z } from "zod";
import { hasAccess, personOf } from "../store/people.ts";
import { setSession } from "../store/session.ts";
import type { MockPerson, MockStore } from "../store/types.ts";
import { mockError } from "./errors.ts";
import { pseudonyms } from "./pseudonyms.ts";

/** What every mock route receives. */
export type MockContext = {
  store: MockStore;
  /** The origin access links start with. */
  origin: string;
};

/**
 * What the pipeline adds: the signed-in person, and the weights that replace
 * the quantities of entries with no weight beside them, by entry id or, for a
 * holding at a moment, by share id, for an anonymous viewer.
 */
export type PipelineContext = {
  viewer: MockPerson | null;
  quantityWeights: Map<string, string>;
};

function signedInPerson(store: MockStore): MockPerson {
  const viewer =
    store.session === null ? undefined : personOf(store, store.session);
  if (viewer === undefined) {
    throw mockError("unauthenticated");
  }
  if (!hasAccess(store, viewer)) {
    setSession(store, null);
    throw mockError("access_ended");
  }
  return viewer;
}

/**
 * The API's request pipeline, on the mock store: a signed-in route needs a
 * session (`unauthenticated`) whose person still has access (`access_ended`)
 * and a role the route accepts (`forbidden`); anonymous viewers write
 * nothing. An anonymous viewer's answer is anonymized after its contract
 * validated it.
 */
const pipeline = os
  .$context<MockContext>()
  .middleware(async ({ context, next, procedure }) => {
    const { meta, route, outputSchema } = procedure["~orpc"];
    const { roles } = meta as RouteMeta;
    const added: PipelineContext = { viewer: null, quantityWeights: new Map() };
    if (roles === "public") {
      return next({ context: added });
    }
    const viewer = signedInPerson(context.store);
    const anonymous = viewer.role === "anonymous";
    if (!roles.includes(viewer.role) || (anonymous && route.method !== "GET")) {
      throw mockError("forbidden");
    }
    added.viewer = viewer;
    const result = await next({ context: added });
    if (!anonymous || outputSchema === undefined) {
      return result;
    }
    const names = pseudonyms(context.store.people.map((person) => person.id));
    // The contracts' schemas are Zod's, which the anonymizer walks.
    const output = anonymizeResponse(
      result.output,
      outputSchema as unknown as z.core.$ZodType,
      {
        pseudonym: (id) => names.get(id) ?? "",
        weights: added.quantityWeights,
      },
    );
    return { ...result, output };
  });

/** Every route of `apiContract`, implemented on the mock store behind the pipeline. */
export const mock = implement(apiContract)
  .$context<MockContext>()
  .use(pipeline);

/** The signed-in person of a signed-in route, which the pipeline has checked. */
export function viewerOf(context: PipelineContext): MockPerson {
  if (context.viewer === null) {
    throw mockError("unauthenticated");
  }
  return context.viewer;
}
